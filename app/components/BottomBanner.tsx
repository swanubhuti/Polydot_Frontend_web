import { FiMail } from "react-icons/fi/index.js";
import { MdPhone, MdFacebook } from "react-icons/md/index.js";
import { VscGlobe } from "react-icons/vsc/index.js"
import { AiFillYoutube } from "react-icons/ai/index.js"
import Navbar from "./ui/Navbar";

const BottomBanner = (props: {includeNavi?: boolean, type?: string, hideExtra?: boolean, addParams?: Record<string, string>, isDraft?: boolean}) => {
  return (
    <div className={`w-full mt-auto ${props.includeNavi ? 'md:border-t-0 z-10 border-gray-300 border-t bg-white md:p-0 py-3 px-2 fixed md:static bottom-0 left-0 right-0' : ''}`}>
        {props.includeNavi && 
            <div className="m-auto max-w-xl md:hidden">
                <Navbar selected={props.type} stretch={true} addParams={props.addParams} hide={["cows","production"]} isDraft={!!props.isDraft} />
            </div>
        }
        <div className={`w-full bg-primary-500 text-white text-center p-3 ${props.hideExtra ? 'hidden md:block' : ''}`}>
            <div className="after:clear-both text-center pb-6 md:pb-0">
                <span className="font-opensans font-normal text-sm lg:px-20 px-0 md:inline-block block pb-4 md:pb-0">
                    Copyright {new Date().getFullYear()} Easy Dairy Automation Systems
                </span>
                <div className={`float-left w-1/2 md:w-auto flex gap-3 ${props.hideExtra ? 'hidden' : ''}`}>
                    <span tabIndex={-1} className="text-white">
                        <MdPhone className="h-6 w-6" />
                    </span>
                    <span className="font-opensans font-normal text-sm whitespace-nowrap">
                        (03) 5821 9900
                    </span>
                </div>
                <div className={`float-right w-1/2 justify-end flex gap-2 md:w-40 ${props.hideExtra ? 'hidden' : ''}`}>
                    <a href="https://www.easydairy.com.au/" target="_blank" rel="noopener noreferrer" tabIndex={-1} className="text-white hover:text-gray-300">
                        <VscGlobe className="h-6 w-6" />
                    </a>
                    <a href="https://www.facebook.com/EasyDairyAutomationSystems" target="_blank" rel="noopener noreferrer" tabIndex={-1} className="text-white hover:text-gray-300">
                        <MdFacebook className="h-6 w-6" />
                    </a>
                    <a href="https://www.youtube.com/channel/UC71Xo3AxtletHTLv5MFAa0Q/videos" target="_blank" rel="noopener noreferrer" tabIndex={-1} className="text-white hover:text-gray-300">
                        <AiFillYoutube className="h-6 w-6" />
                    </a>
                </div>
            </div>
        </div>
    </div>);
};

export default BottomBanner;