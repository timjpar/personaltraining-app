// Conversations: finding them, reading them, and getting a message from a form
// to a person.
//
// The shape is deliberately src/lib/digest.ts's: reads that pages call
// directly, and one best-effort sender whose every failure path is caught. What
// differs is which half is the product. A digest *is* an email; a message is a
// row in a thread that an email merely copies. So nothing here lets a mail
// outage affect whether the message was sent — it was, the moment postMessage
// returned. The email either happened or it didn't, and Message.emailedAt is
// what says which.
import { after } from "next/server";
import { prisma, isUniqueViolation } from "@/lib/db";
import { sendMail, messageEmail, broadcastEmail } from "@/lib/mail";
import { ROLES, THREAD_KINDS, type ThreadKind } from "@/lib/constants";

// The identity of a 1:1 conversation: the two people in it, in an order neither
// of them decides. Sorting is the whole trick — without it the coach's "start a
// thread" and the athlete's would compute different keys for the same pair and
// the unique index would never fire.
export function directKeyFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// Where a thread lives for a given reader. The two roles have separate route
// trees (see src/proxy.ts), so the same thread has two URLs and the only thing
// that decides which is who's looking.
export function threadHref(role: string, threadId: string): string {
  return role === ROLES.TRAINER
    ? `/messages/${threadId}`
    : `/my/messages/${threadId}`;
}

// What a thread is called, which depends on who's reading it: a group has a
// name of its own, and a 1:1 is named after the other person. Hence the
// viewerId — there is no single correct label for a direct thread, which is
// why Thread.title is null on one.
export function threadLabelFor(
  thread: {
    kind: string;
    title: string | null;
    participants: { user: { id: string; name: string } }[];
  },
  viewerId: string,
): string {
  if (thread.kind === THREAD_KINDS.GROUP) {
    return thread.title?.trim() || "Group";
  }
  const other = thread.participants.find((p) => p.user.id !== viewerId);
  return other?.user.name ?? "Conversation";
}

// Claim-then-read, the same move the digest cron makes with DigestRun: the
// unique index on directKey is both the constraint and the lock, so two devices
// opening the same conversation at once produce one thread rather than two.
// Reading first and creating if absent would leave a window between the two
// where both callers see nothing.
export async function findOrCreateDirectThread(
  trainerId: string,
  clientId: string,
) {
  const directKey = directKeyFor(trainerId, clientId);
  try {
    return await prisma.thread.create({
      data: {
        kind: THREAD_KINDS.DIRECT,
        directKey,
        trainerId,
        participants: { create: [{ userId: trainerId }, { userId: clientId }] },
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Someone won the race. The row they wrote is the one we wanted.
    const existing = await prisma.thread.findUnique({ where: { directKey } });
    if (!existing) throw err;
    return existing;
  }
}

export async function createGroupThread(
  trainerId: string,
  title: string,
  clientIds: string[],
) {
  // directKey stays null on a group — see the column's comment for why that's
  // safe against the unique index.
  return prisma.thread.create({
    data: {
      kind: THREAD_KINDS.GROUP,
      title,
      trainerId,
      participants: {
        create: [
          { userId: trainerId },
          ...clientIds.map((userId) => ({ userId })),
        ],
      },
    },
  });
}

// The tab badge, called from both layouts on every authenticated page load, so
// its cost is the cost of navigating anywhere in the app.
//
// Two queries rather than one. The condition is "newer than *this reader's*
// lastReadAt", which is a column on a different table per thread, and Prisma
// has no way to express a cross-row comparison in a single count. The
// alternative is $queryRaw — this app has none, and one round trip is not worth
// being the file that introduces it.
export async function unreadMessageCount(userId: string): Promise<number> {
  const memberships = await prisma.threadParticipant.findMany({
    where: { userId },
    select: { threadId: true, lastReadAt: true },
  });
  if (memberships.length === 0) return 0;

  return prisma.message.count({
    where: {
      // Your own messages are never unread to you.
      senderId: { not: userId },
      OR: memberships.map((m) => ({
        threadId: m.threadId,
        // No lastReadAt means never opened, so every message in it counts.
        ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
      })),
    },
  });
}

// photoUpdatedAt rides along on every participant read in this file so a thread
// row can draw a real face. It is the marker avatarUrl() needs, and it is eight
// bytes — the photo itself lives in its own table precisely so selects like
// these stay cheap.
export type ThreadPerson = {
  id: string;
  name: string;
  photoUpdatedAt: Date | null;
};

export type ThreadSummary = {
  id: string;
  kind: ThreadKind;
  label: string;
  // Everyone but the reader, for the avatar stack on a group row.
  others: ThreadPerson[];
  lastMessage: { body: string; senderName: string; createdAt: Date } | null;
  lastMessageAt: Date;
  unread: number;
};

// The thread list, for either role's inbox.
export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  const memberships = await prisma.threadParticipant.findMany({
    where: { userId },
    select: { threadId: true, lastReadAt: true },
  });
  if (memberships.length === 0) return [];

  const threadIds = memberships.map((m) => m.threadId);

  const [threads, unreadGroups] = await Promise.all([
    prisma.thread.findMany({
      where: { id: { in: threadIds } },
      orderBy: { lastMessageAt: "desc" },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, photoUpdatedAt: true } },
          },
        },
        // The preview line. take: 1 on a descending sort is the newest one.
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
      },
    }),
    prisma.message.groupBy({
      by: ["threadId"],
      where: {
        senderId: { not: userId },
        OR: memberships.map((m) => ({
          threadId: m.threadId,
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        })),
      },
      _count: { _all: true },
    }),
  ]);

  const unreadByThread = new Map(
    unreadGroups.map((g) => [g.threadId, g._count._all]),
  );

  return threads.map((thread) => {
    const last = thread.messages[0];
    return {
      id: thread.id,
      kind: thread.kind as ThreadKind,
      label: threadLabelFor(thread, userId),
      others: thread.participants
        .filter((p) => p.user.id !== userId)
        .map((p) => p.user),
      lastMessage: last
        ? {
            body: last.body,
            senderName: last.sender.name,
            createdAt: last.createdAt,
          }
        : null,
      lastMessageAt: thread.lastMessageAt,
      unread: unreadByThread.get(thread.id) ?? 0,
    };
  });
}

// One thread with its messages, scoped to someone who is actually in it.
// Returns null rather than throwing when they aren't: the id comes out of a
// URL, so "not yours" and "doesn't exist" are the same answer and should look
// the same from outside.
export async function getThreadFor(threadId: string, userId: string) {
  return prisma.thread.findFirst({
    where: { id: threadId, participants: { some: { userId } } },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              photoUpdatedAt: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, photoUpdatedAt: true } },
        },
      },
    },
  });
}

// updateMany, not update: it's a no-op for someone who isn't in the thread,
// which is the behaviour we want if this is ever called with an id from a URL.
export async function markThreadRead(threadId: string, userId: string) {
  await prisma.threadParticipant.updateMany({
    where: { threadId, userId },
    data: { lastReadAt: new Date() },
  });
}

// The write. Three statements that have to land together, because a message
// whose thread didn't get its lastMessageAt bumped sorts to the bottom of the
// inbox and is effectively invisible.
export async function postMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
}) {
  const at = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        body: input.body,
        createdAt: at,
      },
    }),
    prisma.thread.update({
      where: { id: input.threadId },
      data: { lastMessageAt: at },
    }),
    // Replying is reading. Without this the sender's own badge would keep
    // counting the messages they were replying to.
    prisma.threadParticipant.updateMany({
      where: { threadId: input.threadId, userId: input.senderId },
      data: { lastReadAt: at },
    }),
  ]);
  return message;
}

// The whole act of sending, from a validated body to an email on its way:
// checks the sender is actually in the thread, writes the message, and queues
// the copies. Both roles' actions call this, which is the point — a coach's
// send and an athlete's reply are the same operation and any difference
// between them would be a bug rather than a feature.
//
// Null means the sender isn't a participant. The thread id comes out of a URL,
// so "not yours" and "no such thread" have to be indistinguishable from
// outside, and the caller renders the same not-found either way.
export async function deliverMessage(
  origin: string,
  sender: { id: string; name: string; email: string },
  threadId: string,
  body: string,
) {
  const thread = await getThreadFor(threadId, sender.id);
  if (!thread) return null;

  const message = await postMessage({ threadId, senderId: sender.id, body });

  const recipients: EmailRecipient[] = thread.participants
    .filter((p) => p.user.id !== sender.id)
    .map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.user.role,
    }));

  if (recipients.length > 0) {
    // after(), so a slow or dead mail provider can't hold up the reply landing
    // on screen. The same call sendWorkoutEmailSafely gets, and the reason the
    // sender never learns whether mail went out: they've sent the message
    // either way, and Message.emailedAt is where the answer actually lives.
    after(() =>
      sendMessageEmailsSafely(
        origin,
        {
          id: message.id,
          threadId,
          body: message.body,
          senderName: sender.name,
          senderEmail: sender.email,
          // Null on a 1:1. A group's title reads the same to everyone, which
          // is why it needs no viewer — unlike threadLabelFor, whose answer
          // depends on who's asking.
          groupTitle:
            thread.kind === THREAD_KINDS.GROUP
              ? threadLabelFor(thread, sender.id)
              : null,
        },
        recipients,
      ),
    );
  }

  return message;
}

export type EmailRecipient = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Best effort, the exact contract sendWorkoutEmailSafely has: this runs inside
// after(), where a throw has no caller to reach and surfaces only as an
// unhandled rejection in the logs.
//
// The sender is skipped, and emailedAt is set only if at least one send
// actually succeeded — so the thread never claims to have emailed someone when
// mail is switched off.
export async function sendMessageEmailsSafely(
  origin: string,
  message: {
    id: string;
    threadId: string;
    body: string;
    senderName: string;
    // Becomes the Reply-To, which is what makes an emailed message usable:
    // hitting reply reaches a person rather than a no-reply void.
    senderEmail: string;
    groupTitle: string | null;
  },
  recipients: EmailRecipient[],
): Promise<void> {
  try {
    let any = false;
    for (const recipient of recipients) {
      const ok = await sendMail({
        ...messageEmail(origin, {
          recipientName: recipient.name,
          senderName: message.senderName,
          groupTitle: message.groupTitle,
          body: message.body,
          href: threadHref(recipient.role, message.threadId),
        }),
        to: recipient.email,
        replyTo: message.senderEmail,
      });
      if (ok) any = true;
    }
    if (any) {
      await prisma.message.update({
        where: { id: message.id },
        data: { emailedAt: new Date() },
      });
    }
  } catch (err) {
    console.error("Message email failed", err);
  }
}

// The scheduled-message twin of the above, called from the broadcast cron
// rather than from an action. Separate copy rather than a shared loop with a
// builder argument: the two differ in the email they send and in the fact that
// this one has no sender sitting in the thread to skip.
export async function sendBroadcastEmailSafely(
  origin: string,
  message: { id: string; threadId: string; body: string; coachName: string; coachEmail: string },
  recipient: EmailRecipient,
): Promise<boolean> {
  try {
    const ok = await sendMail({
      ...broadcastEmail(origin, {
        recipientName: recipient.name,
        coachName: message.coachName,
        body: message.body,
        href: threadHref(recipient.role, message.threadId),
      }),
      to: recipient.email,
      replyTo: message.coachEmail,
    });
    if (ok) {
      await prisma.message.update({
        where: { id: message.id },
        data: { emailedAt: new Date() },
      });
    }
    return ok;
  } catch (err) {
    console.error("Broadcast email failed", err);
    return false;
  }
}
