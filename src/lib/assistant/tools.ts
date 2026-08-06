// Gemini function-calling schema for the in-app assistant. Kept server-side
// only (imported by the /api/assistant route) -- the client never sees these
// raw schemas, just the resulting functionCall parts.

export const ASSISTANT_TOOLS = [
  {
    name: "create_lead",
    description: "Create a new lead/contact in the CRM.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the lead." },
        phone: { type: "string", description: "Phone number, if known." },
        email: { type: "string", description: "Email address, if known." },
        source: {
          type: "string",
          enum: ["Open House", "Referral", "Inquiry", "Business Card", "Other"],
          description: "How this lead came in. Default to Other if not mentioned.",
        },
        timeline: {
          type: "string",
          enum: ["immediate", "1-3", "3-6", "6plus", "browsing"],
          description: "How soon they intend to buy/rent/sell. Default to browsing if not mentioned.",
        },
        hasAgent: {
          type: "string",
          enum: ["no", "unsure", "yes"],
          description: "Whether they already have a real estate agent. Default to unsure if not mentioned.",
        },
        notes: { type: "string", description: "Free-text notes about the lead." },
      },
      required: ["name"],
    },
  },
  {
    name: "update_lead",
    description: "Update fields on an existing lead. Only include fields that should change.",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "The id of the lead to update, copied exactly from the current leads list." },
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        source: { type: "string", enum: ["Open House", "Referral", "Inquiry", "Business Card", "Other"] },
        timeline: { type: "string", enum: ["immediate", "1-3", "3-6", "6plus", "browsing"] },
        hasAgent: { type: "string", enum: ["no", "unsure", "yes"] },
        notes: { type: "string" },
        stage: {
          type: "string",
          enum: ["New", "Contacted", "Nurturing", "Showing", "Under Contract", "Closed", "Lost"],
        },
      },
      required: ["leadId"],
    },
  },
  {
    name: "create_listing",
    description: "Create a new property listing.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string" },
        price: { type: "number", description: "Listing price, or monthly rent for rentals." },
        agreementType: { type: "string", enum: ["sale", "rental"], description: "Default to sale if not mentioned." },
        description: { type: "string", description: "Notes about the property -- layout, condition, selling points." },
      },
      required: ["address"],
    },
  },
  {
    name: "update_listing",
    description: "Update fields on an existing listing. Only include fields that should change.",
    parameters: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "The id of the listing to update, copied exactly from the current listings list." },
        address: { type: "string" },
        price: { type: "number" },
        agreementType: { type: "string", enum: ["sale", "rental"] },
        description: { type: "string" },
      },
      required: ["listingId"],
    },
  },
  {
    name: "delete_listing",
    description: "Permanently delete a listing. This cannot be undone -- only use it when the user clearly wants the listing gone, not just marked inactive.",
    parameters: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "The id of the listing to delete, copied exactly from the current listings list." },
      },
      required: ["listingId"],
    },
  },
  {
    name: "delete_lead",
    description: "Remove a lead from the active pipeline (soft delete -- recoverable, not permanent).",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "The id of the lead to remove, copied exactly from the current leads list." },
      },
      required: ["leadId"],
    },
  },
  {
    name: "log_interaction",
    description: "Log a call, text, email, or showing on a lead's interaction timeline. Use this instead of update_lead's notes field when the user describes something that just happened with a lead.",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "The id of the lead, copied exactly from the current leads list." },
        text: { type: "string", description: "A short description of the interaction, e.g. 'Called to confirm Saturday showing.'" },
      },
      required: ["leadId", "text"],
    },
  },
  {
    name: "create_task",
    description: "Add a to-do item to the agent's task list.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The task text." },
      },
      required: ["text"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a to-do item as done.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The id of the task, copied exactly from the current task list." },
      },
      required: ["taskId"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a to-do item.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The id of the task, copied exactly from the current task list." },
      },
      required: ["taskId"],
    },
  },
  {
    name: "create_template",
    description: "Create a new reusable follow-up message template.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short name for the template, e.g. 'First touch (hot lead)'." },
        body: { type: "string", description: "The message body." },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "update_template",
    description: "Update an existing template's title and/or body.",
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "The id of the template, copied exactly from the current templates list." },
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["templateId"],
    },
  },
  {
    name: "delete_template",
    description: "Permanently delete a template.",
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "The id of the template, copied exactly from the current templates list." },
      },
      required: ["templateId"],
    },
  },
  {
    name: "create_event",
    description: "Create a calendar event -- a showing, closing, call, or any appointment. Can optionally be linked to a lead and/or a listing.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "e.g. 'Showing with Jamie Rivera'" },
        date: { type: "string", description: "Date in YYYY-MM-DD format." },
        time: { type: "string", description: "Time in 24-hour HH:MM format. Default to 09:00 if not mentioned." },
        notes: { type: "string" },
        leadId: { type: "string", description: "Id of a related lead, copied exactly from the current leads list, if this event is about one." },
        listingId: { type: "string", description: "Id of a related listing, copied exactly from the current listings list, if this event is about one." },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "update_event",
    description: "Update fields on an existing calendar event. Only include fields that should change.",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The id of the event, copied exactly from the current calendar events list." },
        title: { type: "string" },
        date: { type: "string", description: "Date in YYYY-MM-DD format." },
        time: { type: "string", description: "Time in 24-hour HH:MM format." },
        notes: { type: "string" },
        leadId: { type: "string" },
        listingId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "delete_event",
    description: "Permanently delete a calendar event.",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The id of the event, copied exactly from the current calendar events list." },
      },
      required: ["eventId"],
    },
  },
  {
    name: "attach_file_to_lead",
    description: "Attach an existing uploaded file to a lead (or detach it by omitting leadId).",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "The id of the file, copied exactly from the current files list." },
        leadId: { type: "string", description: "The id of the lead to attach it to. Omit to detach the file from any lead." },
      },
      required: ["fileId"],
    },
  },
  {
    name: "rename_file",
    description: "Rename an existing uploaded file.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "The id of the file, copied exactly from the current files list." },
        name: { type: "string", description: "The new file name." },
      },
      required: ["fileId", "name"],
    },
  },
  {
    name: "delete_file",
    description: "Permanently delete an uploaded file.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "The id of the file, copied exactly from the current files list." },
      },
      required: ["fileId"],
    },
  },
  {
    name: "convert_file_to_pdf",
    description: "Convert an existing uploaded file to a PDF (currently only works for images and plain-text files -- do not call this for other file types).",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "The id of the file, copied exactly from the current files list." },
      },
      required: ["fileId"],
    },
  },
] as const;

export interface AssistantLeadContext {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  stage: string;
  source: string;
}

export interface AssistantListingContext {
  id: string;
  address: string;
  agreementType: string;
  price: number | null;
}

export interface AssistantTaskContext {
  id: string;
  text: string;
  done: boolean;
}

export interface AssistantTemplateContext {
  id: string;
  title: string;
}

export interface AssistantEventContext {
  id: string;
  title: string;
  startAt: string;
  leadId: string | null;
  listingId: string | null;
}

export interface AssistantFileContext {
  id: string;
  name: string;
  leadId: string | null;
  convertibleToPdf: boolean;
}

export function buildSystemInstruction(ctx: {
  agentName: string;
  leads: AssistantLeadContext[];
  listings: AssistantListingContext[];
  tasks: AssistantTaskContext[];
  templates: AssistantTemplateContext[];
  events: AssistantEventContext[];
  files: AssistantFileContext[];
  // Pre-formatted using the AGENT'S local clock (computed client-side with
  // plain Date getters, never toISOString/UTC) -- re-deriving these from an
  // instant on the server would silently shift to the server's timezone
  // (Vercel runs in UTC) and could show the wrong calendar day near midnight.
  todayLabel: string;
  todayIso: string;
}) {
  const nowBlock = ctx.todayLabel;
  const todayIso = ctx.todayIso;

  const leadsBlock = ctx.leads.length
    ? ctx.leads
        .map(
          (l) =>
            `- id=${l.id} | ${l.name} | stage=${l.stage} | source=${l.source}` +
            (l.phone ? ` | phone=${l.phone}` : "") +
            (l.email ? ` | email=${l.email}` : ""),
        )
        .join("\n")
    : "(no leads yet)";

  const listingsBlock = ctx.listings.length
    ? ctx.listings
        .map((l) => `- id=${l.id} | ${l.address} | ${l.agreementType}` + (l.price != null ? ` | $${l.price}` : ""))
        .join("\n")
    : "(no listings yet)";

  const tasksBlock = ctx.tasks.length
    ? ctx.tasks.map((t) => `- id=${t.id} | ${t.done ? "[done] " : ""}${t.text}`).join("\n")
    : "(no tasks yet)";

  const templatesBlock = ctx.templates.length
    ? ctx.templates.map((t) => `- id=${t.id} | ${t.title}`).join("\n")
    : "(no templates yet)";

  const eventsBlock = ctx.events.length
    ? ctx.events
        .map((e) => `- id=${e.id} | ${e.title} | ${e.startAt}` + (e.leadId ? ` | lead=${e.leadId}` : "") + (e.listingId ? ` | listing=${e.listingId}` : ""))
        .join("\n")
    : "(no events yet)";

  const filesBlock = ctx.files.length
    ? ctx.files
        .map((f) => `- id=${f.id} | ${f.name}` + (f.leadId ? ` | attached to lead ${f.leadId}` : "") + (f.convertibleToPdf ? " | can convert to PDF" : " | cannot convert to PDF"))
        .join("\n")
    : "(no files yet)";

  return `You are Foyer's in-app assistant, helping ${ctx.agentName || "a solo real estate agent"} manage their CRM -- leads, property listings, tasks, calendar, follow-up templates, and files.

Today's date is ${nowBlock} (${todayIso}). Resolve "today", "tomorrow", "next Monday", etc. against this date, not any other date you might otherwise assume. Always pass create_event/update_event dates as YYYY-MM-DD.

Rules:
- Every create, update, or delete goes through one of your functions. The app always shows the person a confirmation card before anything is saved to the database, so call a function as soon as you have enough information -- you do not need to ask "should I do this?" first, since confirmation happens automatically afterward.
- If a request is ambiguous (e.g. more than one lead matches a name, or a required field is missing), ask a short clarifying question in plain text instead of guessing.
- When referring to an existing lead, listing, task, template, event, or file, copy its id exactly from the lists below -- never invent one.
- Prefer log_interaction over update_lead's notes field when the user is describing something that just happened (a call, text, showing) rather than a correction to the lead's info.
- Delete actions are permanent for listings, tasks, templates, events, and files -- only call those when the user is clearly asking to remove something, not just deprioritize it.
- You cannot upload new files -- only the person can do that from their device. You can rename, attach-to-lead, delete, or convert-to-PDF files that already exist in the list below. Only call convert_file_to_pdf on a file marked "can convert to PDF" -- for anything else, tell the person that format isn't supported for conversion yet.
- Keep replies brief and conversational, like a helpful assistant, not a form. After a function result comes back, confirm what happened in one short sentence.

Current leads:
${leadsBlock}

Current listings:
${listingsBlock}

Current tasks:
${tasksBlock}

Current templates:
${templatesBlock}

Current calendar events:
${eventsBlock}

Current files:
${filesBlock}`;
}
