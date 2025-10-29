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

// Inngest function to save workplace data to database
const syncWorkspceCreation = inngest.createFunction(
    { id: 'sync-workspace-from-clerk'},
    {event: 'clerk/organization.created'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspace.create({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                ownerId: data.created_by,
                image_url: data.image_url
            }
        })

        // Add creator as Admin Member
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        })
    }
)

// Inngest function to update workspace data in database
const synWorkspaceUpdation = inngest.createFunction(
    {id: 'update-workspace-from-clerk'},
    {event: 'clerk/organization.updated'},
    async({event}) => {
        const {data} = event;
        await prisma.workspace.update({
            where: {
                id: data.id
            },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url
            }
        })
    }
)

// Inngest Function to delete workspace from database
const syncWorkspceDeletion = inngest.createFunction(
    {id: 'delete-workspace-with-clerk'},
    {event: 'clek/organizatin.deleted'},
    async ({event}) => {
        const {data} = event;
        await prisma.workspace.delete({
            where: {
                id: data.id
            }
        })
    }
)

// Inngest function to save workpace member data to a database
const syncWorkspceMemberCreation = inngest.createFunction(
    {id: 'sync-workspace-member-from-clerk'},
    {event: 'clerk/organizationInvitation.accepted'},
    async ({event}) => {
        const { data } = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role_name).toUpperCase(),
            }
        })
    }
)

// ✅ Export all Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspceCreation,
  synWorkspaceUpdation,
  syncWorkspceMemberCreation
];
