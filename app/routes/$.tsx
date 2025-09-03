import { type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import BottomBanner from "~/components/BottomBanner";
import companyLogo from "../images/easydairy-logo.jpg";
import SelectDropdown from "~/components/ui/Dropdown";
import Navbar from "~/components/ui/Navbar";
import { Form, useLoaderData } from "@remix-run/react";
import { getUserAccessToken } from "~/session.server";

export const meta: MetaFunction = ({matches}) => {
  return [
    { title: `Easy Dairy 404` },
    { name: "description", content: "This page does not exist" },
  ];
};

export async function loader({request, params}: LoaderFunctionArgs) {
  const {userData, headers} = await getUserAccessToken(request)

  return json({userData}, {...headers, status: 404})
}

export default function Default() {
  const data = useLoaderData<typeof loader>()
  const dropdownOpts = [
    {value: data.userData?.UserID, label: data.userData?.FirstName},
    {value: "logout", label: "Logout"}
  ]
  const isLoggedIn = !!data.userData?.UserID
  return (
    <main className={`flex flex-col justify-between min-h-screen gap-5 md:pt-36 md:pb-0 ${isLoggedIn ? 'pb-36' : ''}`}>
      <div className="bg-grey-100 p-4 md:fixed top-0 left-0 right-0 z-30">
        <div className="flex justify-between items-center gap-3">
            <img
              src={companyLogo}
              alt="Easy Dairy Logo"
              className="w-36 h-16"
            />
            {isLoggedIn && <>
              <SelectDropdown type="single" options={dropdownOpts} value={data.userData?.UserID} className="text-primary-500" onSelectChange={(val) => {
                if (val.value === 'logout') {
                  document.getElementById('submit')?.click();
                }
              }} />
              <div className="ml-auto hidden md:block">
                <Navbar selected={''} hide={["cows","events","production"]} />
              </div>
              <Form method="post" action="/logout" className="hidden">
                <button type="submit" id="submit" tabIndex={-1}></button>
              </Form>
            </>
            }
        </div>
      </div>
      <div className="max-w-6xl m-auto flex justify-center">
        <h1 className="text-3xl">
          This page does not exist
        </h1>
      </div>
      <BottomBanner includeNavi={isLoggedIn} type={''} />
    </main>
  )
}
