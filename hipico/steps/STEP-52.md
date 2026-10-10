# STEP-52: a real contact form instead of a second WhatsApp button

Ivana (9 Oct): in the service lightboxes, "Agenda una clase muestra" and "Escríbenos" both open WhatsApp. Two buttons, same job. **"Escríbenos" becomes a contact form inside the lightbox.**

## 1. Buttons
- **Agenda una clase muestra** (mustard glass): stays WhatsApp with its ready message.
- **Escríbenos** (sage glass): opens the form **in the same lightbox** (the right column slides to the form; "← Volver" returns to the service text). No new page, no WhatsApp.
- The same form is used for "Escríbenos por WhatsApp" in Visítanos → rename that button "Escríbenos" and open the form in a lightbox there too; keep a small WhatsApp link next to it ("o por WhatsApp").

## 2. The form
Fields: **Nombre** · **Teléfono (WhatsApp)** · **Correo** (one of the two is required) · **¿Cómo prefieres que te contactemos?** WhatsApp / Correo (pills) · **Mensaje** (pre-filled with the service: "Me interesa: Clases") · a hidden honeypot field. Button: **Enviar mensaje** (mustard glass). ES + EN.
- On send: a calm success state in the lightbox ("¡Gracias, {nombre}! Te contestamos hoy mismo por WhatsApp/correo."), the form resets.
- Errors in plain words under the field; the button shows a spinner while sending.

## 3. Where the message goes
- **Saved first** in a new table `contact_messages` (name, phone, email, preferred channel, service, message, page, created_at, status: nuevo / contestado), insert allowed for anon through an RPC `send_contact_message()` with basic rate limiting (max 5 per IP/phone per hour) and the honeypot check. Migration safe to run twice; grant execute to anon.
- **Emailed to the club** by a new serverless function `api/contact.js` using the same sender as the reminders (`api/_reminders.js`: Resend or SMTP). Subject "Nuevo mensaje · {servicio} · {nombre}", body with all fields and a one-tap WhatsApp link to the person's number (`wa.me/52…` with a ready reply). Destination: the club email (`contact.email` in `content.js`, today hipicorivieramaya@gmail.com).
- If the email sender isn't configured yet (SMTP_USER/SMTP_PASS missing in Vercel), the message is still saved and shows in the panel; the visitor still gets the success state.
- **Management panel:** a **"Mensajes"** item (badge with the count of new ones): list with name, service, channel, date; open → full message, "Responder por WhatsApp" / "Responder por correo" buttons, "Marcar como contestado".

## Check
Send a test from the Clases lightbox and from Visítanos (ES and EN): the success state, the row in `contact_messages`, the message in Dirección → Mensajes, and the email (or, if SMTP isn't set, a clear note in the report that it's waiting for SMTP_USER/SMTP_PASS in Vercel). Honeypot and rate limit tested.

## 4. Small fix: Cobros filter bar (Ivana's screenshot, 9 Oct)
- The concept pills overflow and **"Eventos" is cut off under the "Imprimir" button**. Let the pills **wrap** to a second line on narrow widths (desktop) and scroll sideways with a soft fade on phones; nothing may sit on top of a pill.
- **Imprimir** moves out of the row to the right end of the page header (with the other page actions).
- There are **two "Todos"** (status and concept): rename the concept one to **"Todos los conceptos"** (or group the concept pills under a small label "Concepto"), so they can't be confused.
- Check the same pattern in every filter bar of the panel (Familias, Caballos, Nómina, Reportes) at 1024, 1280 and 1440 px.
