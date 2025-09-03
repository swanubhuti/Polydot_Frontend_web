import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { createAppUserSession, verifyLogin } from "~/session.server";
import * as crypto from "crypto";

export async function loader({request}: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams
  const data = searchParams.get("data")
  const ivx = searchParams.get("ivx")
  if (data && ivx) {
    const iv = Buffer.from(ivx, 'hex')
    const encrypted = Buffer.from(data, 'hex')
    if (iv && encrypted) {
      let decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.TOKEN_GENERATE_KEY!, 'hex'), iv)
      let decrypted = decipher.update(encrypted)
      const tokenData = JSON.parse(decrypted.toString())
      if (tokenData.value) {
        const {data, headers} = await createAppUserSession({request, accessToken: tokenData.value, duration: tokenData.duration})
        if (data.success) {
          return redirect(data.userData?.EasyDraft ? "/dashboard/drafts" : "/dashboard/mobile", headers as ResponseInit);
        }
      }
    }
  }
  
  return json({})
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");

  const errors: {[key: string]: null | string} = {
    username: username ? null : "Username is required",
    password: password ? null : "Password is required",
  };

  const hasErrors = Object.values(errors).some(
    (errorMessage) => errorMessage
  );
  if (hasErrors) {
    return json(errors);
  }

  // Perform form validation
  // Return the errors if there are any
  const verify = await verifyLogin(username as string, password as string, request);
  
  if ('error' in verify) {
    return json({success: false, errors: verify.error})
  }
  const iv = crypto.randomBytes(16)
  let cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.TOKEN_GENERATE_KEY!, 'hex'), iv)
  let encrypted = cipher.update(JSON.stringify(verify.accessToken))

  return json({success: true, data: encrypted.toString('hex'), ivx: iv.toString('hex')})
}
