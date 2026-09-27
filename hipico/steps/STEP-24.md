# STEP-24: clear view / edit / save everywhere (starting with the horse profile)

Problem: in the horse profile you edit things (photos, ración, salud) but there's no clear **Guardar**, so it's not obvious when you're done or how the finished profile looks.

## Pattern: view mode ⇄ edit mode (apply it to every management form)
- **View mode (default):** the finished profile, clean and read-only: photo on top, name, the facts line (age · sex · breed · color · height), category + level chips, a Ración diaria card, a Salud list with next due dates. One **Editar** button (top right).
- **Edit per section (keep what exists):** each card (Datos, Fotos, Ración diaria, Salud) has its own **Editar**. While a section is being edited, its **Guardar** is the clear primary button (coral glass, white text, full width on phones) with **Cancelar** as a text link next to it. The current pale "Guardar cambios" looks disabled, so fix that. Only one section is in edit mode at a time, and the rest stays in view mode.
- **After Guardar:** back to view mode + toast **"Caballo guardado"**. Errors appear next to the field.
- **Leaving with unsaved changes:** ask "¿Descartar cambios?" (Descartar / Seguir editando).
- **New horse:** "+ Nuevo caballo" opens edit mode directly; the button says **"Guardar caballo"**, and after saving it shows the finished profile.
- **Photos:** uploading shows a progress state and then "Foto guardada", so there's never a question whether it stuck.
- **Pensión horses:** a small link **"Ver como lo ve el dueño"** previews exactly what the owner family sees in Más → Mi caballo.

## Same pattern elsewhere
Apply the same view/edit/Guardar/toast behavior to: families and riders, classes in Horario, employees (Nómina), expenses, prices and bank details in settings. Anywhere an edit happens, there's one obvious **Guardar** and a confirmation.

Mirror it in `/demo`.
