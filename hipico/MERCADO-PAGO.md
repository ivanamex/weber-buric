# Pagos con tarjeta (Mercado Pago)

El cobro con tarjeta ya está construido: en la página del club (Clases → Pagar) y en la app. Se enciende solo cuando las
credenciales del club están en Vercel. Mientras falten, la opción "Tarjeta" no aparece y todo sigue funcionando por transferencia.

## Qué necesitas de Mara

La cuenta de Mercado Pago del club (verificada, a nombre del club o de la dueña) y acceso para crear las credenciales.

## 5 pasos

1. **Credenciales de producción.** Entra a https://www.mercadopago.com.mx/developers/panel/app con la cuenta del club → *Tus integraciones* → *Crear aplicación* (nombre "Hípico Riviera Maya", producto "Pagos online", plataforma "Web") → dentro de la app, *Credenciales de producción*. Copia el **Access Token** (empieza con `APP_USR-`) y la **Public Key**.
2. **Pégalas en Vercel.** Vercel → proyecto **hipico** → *Settings* → *Environment Variables* → *Add*:
   - `MP_ACCESS_TOKEN` = el Access Token
   - `MP_PUBLIC_KEY` = la Public Key
   Marca los tres entornos (Production, Preview, Development) y guarda.
3. **La notificación (webhook).** En la misma aplicación de Mercado Pago → *Webhooks* → *Configurar notificaciones* → modo *Productivo*: URL `https://hipico-riviera-maya.vercel.app/api/mp-webhook`, evento **Pagos**. Guarda. Mercado Pago muestra una **clave secreta** para firmar las notificaciones: cópiala.
4. **La clave secreta en Vercel.** Otra variable: `MP_WEBHOOK_SECRET` = esa clave. Guarda.
5. **Vuelve a publicar.** Vercel → *Deployments* → el último → *Redeploy* (las variables nuevas entran con el siguiente despliegue). Al terminar, abre la página del club → Clases → elige una opción → Pagar: ahora aparece **Tarjeta** junto a Transferencia.

## Para probar sin cobrar de verdad

Con las *credenciales de prueba* (`TEST-…`) y un usuario comprador de prueba (en el panel de Mercado Pago → *Cuentas de prueba*), el mismo flujo cobra a tarjetas de prueba. Pon las credenciales de prueba en Vercel, prueba, y cámbialas por las de producción al final.

## Cómo funciona

- `api/mp-checkout.js` crea la preferencia de Checkout Pro para un cobro (precio desde la base de datos, `external_reference` = el id del cobro) y manda a la persona a Mercado Pago. Al volver, cae en `/pago/recibido`, `/pago/pendiente` o `/pago/rechazado`.
- `api/mp-webhook.js` recibe la notificación, verifica la firma (`x-signature` con `MP_WEBHOOK_SECRET`), lee el pago desde la API de Mercado Pago y marca el cobro como pagado con tarjeta (el plan se activa y la familia recibe un correo). La misma notificación dos veces no cambia nada.
- Vercel: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`. Nunca van en el código.
