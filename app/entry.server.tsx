/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { PassThrough } from "node:stream";

import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  return isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={ABORT_DELAY}
      />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          responseHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
          responseHeaders.set("X-Frame-Options", "Deny")
          responseHeaders.set("X-Content-Type-Options", "nosniff")
          responseHeaders.set("Content-Security-Policy", `default-src 'self' https://www.google-analytics.com apis.google.com ${process.env.BASE_URL} 
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
            img-src 'self' data:;
            frame-ancestors 'self';
            font-src 'self' data: https://fonts.gstatic.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            connect-src 'self' https://www.google-analytics.com ${process.env.BASE_URL};
            `.replace(/\s{2,}/g, '').trim()
          )

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={ABORT_DELAY}
      />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          const isLocal = request.url.includes('localhost:')

          responseHeaders.set("Content-Type", "text/html");
          if (!isLocal) {
            responseHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
            responseHeaders.set("X-Frame-Options", "Deny")
            responseHeaders.set("X-Content-Type-Options", "nosniff")
            responseHeaders.set("Content-Security-Policy", `default-src 'self' apis.google.com ${process.env.BASE_URL} 
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
              img-src 'self' data:;
              frame-ancestors 'self';
              font-src 'self' data: https://fonts.gstatic.com;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              connect-src 'self' https://www.google-analytics.com ${process.env.BASE_URL};
              `.replace(/\s{2,}/g, '').trim()
            )
          }

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
