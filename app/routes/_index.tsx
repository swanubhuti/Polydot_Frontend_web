import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { Form, useActionData, useNavigate, useLoaderData, Link } from "@remix-run/react";
import BottomBanner from "~/components/BottomBanner";
import Button from "~/components/ui/Button";
import Dialog, {type DialogProps, type ColorPresetKeys} from "~/components/ui/Dialog";
import Input from "~/components/ui/Input";
import companyLogo from "../images/easydairy-logo.jpg";
import { createUserSession, getUserAccessToken, verifyLogin } from "~/session.server";
import { useEffect, useState } from "react";
import { removeLocal } from "~/lib/utils";
import ForcePasswordChangeModal from "~/components/ForcePasswordChangeModal";

export const meta: MetaFunction = () => {
  return [
    { title: "Easy Dairy" },
    { name: "description", content: "Welcome to Easy Dairy" },
  ];
};

const formInputs = [
  {name: 'username', label: 'Username', err:'', type: 'text'},
  {name: 'password', label: 'Password', err:'', type: 'password'},
];

function getRedirectPath(userData: Record<string, any>) {
  let route = "/dashboard"
  if (userData.Role === "admin") {
    route = "/admin"
  } else if (userData.HomePage === "My Dashboard") {
    route = "/dashboard/summary/personal/view"
  }
  return route
}

export async function loader({request}: LoaderFunctionArgs) {
  const {accessToken, userData, headers} = await getUserAccessToken(request);
  if (!userData) {
    throw new Error("No user data")
  }
  if (accessToken) {
    const ref = request.headers.get("referer")?.split(/\/?\?/)[0]
    const url = request.url.split(/\/\?/)[0]
    if (ref && ref.replace(/https?:\/\//, '') === url.replace(/https?:\/\//, '')) {
      return json({loaderDialogData: {isOpen: false}}, headers)
    } else {
      return redirect(getRedirectPath(userData), headers);
    }
  }
  return json({loaderDialogData: {isOpen: false}}, headers)
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
    return json(verify.error)
  }

  // Check if user needs to force change password
  if ('requirePasswordChange' in verify && verify.requirePasswordChange) {
    const resp = await createUserSession({
      request,
      refreshToken: verify.refreshToken.value,
      cookieName: verify.refreshToken.name,
      accessToken: verify.accessToken.value,
      duration: verify.accessToken.duration,
      refreshDuration: verify.refreshToken.duration
    });

    return json({
      ...resp.data,
      requirePasswordChange: true
    }, resp.headers as ResponseInit);
  }

  const resp = await createUserSession({
    request,
    refreshToken: verify.refreshToken.value,
    cookieName: verify.refreshToken.name,
    accessToken: verify.accessToken.value,
    duration: verify.accessToken.duration,
    refreshDuration: verify.refreshToken.duration
  });

  return json(resp.data, resp.headers as ResponseInit)
}

export default function Login() {
  const response = useActionData<{message?: string, success?: boolean, username?: string, password?: string, userData?: any, requirePasswordChange?: boolean}>();
  const {loaderDialogData} = useLoaderData<typeof loader>();
  const [dialogData, setDialogData] = useState<DialogProps>(loaderDialogData)
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (response && 'success' in response && response['success']) {
      // Check if user needs to force change password
      if (response.requirePasswordChange) {
        setShowForcePasswordChange(true);
        return;
      }

      let userData = response.userData;
      if (!userData) {
        setDialogData({
          isOpen: true,
          title: "Error",
          icon: 'error',
          color: 'error' as ColorPresetKeys,
          message: 'Could not get user'
        })
        return
      }
      // clear previous login data
      removeLocal('herdList');
      removeLocal('herdCode');
      removeLocal('colPref');
      removeLocal('chartsAvailable');
      setTimeout(() => {
        setDialogData({
          isOpen: false
        })
        navigate(getRedirectPath(userData), {
          replace: true
        })
      }, 3000);
      setDialogData({
        isOpen: true,
        title: "Success",
        icon: 'success',
        color: 'primary' as ColorPresetKeys
      })
    }
    removeLocal('herdUuid')
  }, [response, navigate]);

  return (
    <div className="flex flex-col min-h-screen justify-center">
      <div className="flex-grow flex-col flex items-center justify-center space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <img
            src={companyLogo}
            alt="Easy Dairy Logo"
            className="mx-auto md:h-32 md:w-64 w-44 h-20"
          />
        </div>
        <div>
          <h2 className="mt-6 text-center text-black font-semibold md:text-4xl xs:text-3xl text-2xl font-signika">
            Welcome to Easy Dairy
          </h2>
          <h6 className="mt-3 text-center xs:text-base text-black text-sm font-normal font-opensans">Automation System for your farm</h6>
        </div>
        <Form className="space-y-6 mx-auto xs:min-w-[290px] min-w-0 pb-4" method="post">
          <div className="md:mt-6 mt-3 flex flex-col">
            {formInputs.map((fi, i) => (
              <div key={`login-${i}`} className='w-full mt-4 first:mt-0'>
                <Input
                  id={fi.name}
                  name={fi.name}
                  type={fi.type}
                  label={fi.label}
                  required
                  //@ts-ignore
                  error={response ? response[fi.name] ?? "" : ""}
                  placeholder={fi.label}
                />
              </div>
            ))}
            <Link to="/password/forgot" className="mt-1 text-sm lg:text-base block ml-auto underline text-primary-500 font-semibold hover:opacity-70">Forgot Password</Link>
          </div>
          {response && 'message' in response && <p className="mt-4 text-error-500 text-sm text-center">{response.message}</p>}
          <div>
            <Button
              type="submit"
              className="text-lg w-full font-bold"
            >
              Login
            </Button>
          </div>
        </Form>
        {/* <div>
          Need to create an account? <a className="underline text-blue-900" href="#">Sign Up</a>
        </div> */}
      </div>
      <Dialog
        {...dialogData}
      />
      <ForcePasswordChangeModal
        isOpen={showForcePasswordChange}
        onClose={() => setShowForcePasswordChange(false)}
        onSuccess={() => {
          setShowForcePasswordChange(false);
          // Redirect to dashboard after successful password change
          window.location.href = '/dashboard';
        }}
      />
      <BottomBanner />
    </div>
  );
}
