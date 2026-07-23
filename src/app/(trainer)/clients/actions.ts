"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTrainer, hashPassword } from "@/lib/auth";

export type AddClientState = {
  error?: string;
  created?: { name: string; email: string; password: string };
};

function generatePassword() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `chalk-${rand}`; // >= 8 chars, easy to read aloud
}

export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const trainer = await requireTrainer();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let password = String(formData.get("password") ?? "").trim();

  if (!name || !email) {
    return { error: "Add a name and an email for your client." };
  }
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Someone already uses that email." };
  }

  if (!password) password = generatePassword();

  await prisma.user.create({
    data: {
      name,
      email,
      role: "CLIENT",
      trainerId: trainer.id,
      passwordHash: await hashPassword(password),
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { created: { name, email, password } };
}
