import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

/**
 * 🧩 Handle Clerk user creation -> Sync to database
 */
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.user.create({
        data: {
          id: data.id,
          email: data?.email_addresses?.[0]?.email_address ?? "",
          name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
          image: data?.image_url ?? "",
        },
      });
      console.log(`✅ User created: ${data.id}`);
    } catch (error) {
      // Prevent crash on duplicate user
      if (error.code === "P2002") {
        console.log(`⚠️ User already exists: ${data.id}`);
      } else {
        console.error("❌ Error creating user:", error);
      }
    }
  }
);

/**
 * 🗑️ Handle Clerk user deletion -> Remove from database
 */
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.user.delete({
        where: { id: data.id },
      });
      console.log(`🗑️ User deleted: ${data.id}`);
    } catch (error) {
      // Ignore if user already deleted
      if (error.code === "P2025") {
        console.log(`⚠️ User not found (already deleted): ${data.id}`);
      } else {
        console.error("❌ Error deleting user:", error);
      }
    }
  }
);

/**
 * 🔄 Handle Clerk user update -> Sync changes to database
 */
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;

    try {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data?.email_addresses?.[0]?.email_address ?? "",
          name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
          image: data?.image_url ?? "",
        },
      });
      console.log(`🔁 User updated: ${data.id}`);
    } catch (error) {
      if (error.code === "P2025") {
        console.log(`⚠️ Tried to update missing user: ${data.id}`);
      } else {
        console.error("❌ Error updating user:", error);
      }
    }
  }
);

// ✅ Export all Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];
