import styles from "./index.css";
import { json, type LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import Spinner from "./components/ui/Spinner";
import CropCSS from "cropperjs/dist/cropper.css";
import quillcss from 'react-quill/dist/quill.snow.css';

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Signika+Negative:wght@400;600&display=swap"},
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: CropCSS},
  { rel: "stylesheet", href: quillcss}
];

export const loader = async () => {
  return json({ gaTrackingId: process.env.GA_TRACKING_ID});
};

export default function App() {
  const { gaTrackingId } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {gaTrackingId && <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`} />
          <script async dangerouslySetInnerHTML={{__html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${gaTrackingId}');`}}/>
        </>}
        <Outlet />
        <Spinner />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
