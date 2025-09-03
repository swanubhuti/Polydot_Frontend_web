import { Link, useMatches } from "@remix-run/react";
import { useEffect, useState } from "react";
import { AiOutlineGateway } from "react-icons/ai";
import { FaChartColumn, FaCow } from "react-icons/fa6";
import { IoShieldCheckmark } from "react-icons/io5";
import { NAV_ITEMS } from "~/lib/nav";
import { getLocalStore } from "~/lib/utils";

interface Props {
  selected?: string;
  hide?: string[];
  enterprise?: boolean;
  stretch?: boolean;
  isDraft?: boolean;
  isApp?: boolean;
  addParams?: Record<string, string>
}

export const NavIcons = (props: {type: string, classes: string}) => {
  switch (props.type) {
    case "bulls":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
          <g>
            <path d="M35 15C35 15.442 34.8244 15.8659 34.5118 16.1785C34.1993 16.4911 33.7753 16.6667 33.3333 16.6667C32.8913 16.6667 32.4674 16.4911 32.1548 16.1785C31.8422 15.8659 31.6667 15.442 31.6667 15V10.69L25.7717 16.585C27.6947 19.1059 28.588 22.2633 28.2706 25.418C27.9531 28.5728 26.4487 31.489 24.062 33.5762C21.6752 35.6634 18.5845 36.7656 15.4156 36.6596C12.2467 36.5537 9.23653 35.2474 6.99455 33.0054C4.75256 30.7635 3.44633 27.7533 3.34036 24.5844C3.2344 21.4155 4.3366 18.3248 6.42381 15.938C8.51101 13.5512 11.4272 12.0468 14.5819 11.7294C17.7367 11.412 20.8941 12.3052 23.415 14.2283L29.31 8.33333H25C24.558 8.33333 24.134 8.15774 23.8215 7.84518C23.5089 7.53262 23.3333 7.10869 23.3333 6.66667C23.3333 6.22464 23.5089 5.80072 23.8215 5.48816C24.134 5.17559 24.558 5 25 5H32.9167C34.0667 5 35 5.93333 35 7.08333V15ZM15.8333 15C13.4022 15 11.0706 15.9658 9.35151 17.6849C7.63242 19.4039 6.66665 21.7355 6.66665 24.1667C6.66665 26.5978 7.63242 28.9294 9.35151 30.6485C11.0706 32.3676 13.4022 33.3333 15.8333 33.3333C18.2645 33.3333 20.596 32.3676 22.3151 30.6485C24.0342 28.9294 25 26.5978 25 24.1667C25 21.7355 24.0342 19.4039 22.3151 17.6849C20.596 15.9658 18.2645 15 15.8333 15Z"/>
          </g>
      </svg>
    case "calendar":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
        <path id="Vector" d="M31.6667 6.66668H30V3.33334H26.6667V6.66668H13.3333V3.33334H10V6.66668H8.33333C6.48333 6.66668 5.01667 8.16668 5.01667 10L5 33.3333C5 34.2174 5.35119 35.0652 5.97631 35.6904C6.60143 36.3155 7.44928 36.6667 8.33333 36.6667H31.6667C33.5 36.6667 35 35.1667 35 33.3333V10C35 8.16668 33.5 6.66668 31.6667 6.66668ZM31.6667 33.3333H8.33333V16.6667H31.6667V33.3333ZM15 23.3333H11.6667V20H15V23.3333ZM21.6667 23.3333H18.3333V20H21.6667V23.3333ZM28.3333 23.3333H25V20H28.3333V23.3333ZM15 30H11.6667V26.6667H15V30ZM21.6667 30H18.3333V26.6667H21.6667V30ZM28.3333 30H25V26.6667H28.3333V30Z"/>
      </svg>
    case "cows":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
        <path d="M11.6666 15.8333C11.667 13.0123 12.6215 10.2744 14.3751 8.06465C16.1287 5.85491 18.5782 4.3033 21.3254 3.66209C24.0725 3.02088 26.9558 3.32777 29.5065 4.53286C32.0571 5.73795 34.1251 7.77039 35.3743 10.2997C36.6235 12.8291 36.9803 15.7066 36.3869 18.4645C35.7935 21.2224 34.2846 23.6984 32.1056 25.4901C29.9266 27.2817 27.2057 28.2837 24.3851 28.333C21.5645 28.3823 18.8102 27.4761 16.57 25.7617L13.59 28.74L15.9666 31.1167C16.1258 31.2704 16.2528 31.4543 16.3401 31.6577C16.4275 31.861 16.4734 32.0797 16.4754 32.301C16.4773 32.5223 16.4351 32.7418 16.3513 32.9466C16.2675 33.1514 16.1438 33.3375 15.9873 33.494C15.8308 33.6505 15.6447 33.7742 15.4399 33.858C15.235 33.9418 15.0156 33.984 14.7943 33.9821C14.573 33.9802 14.3543 33.9342 14.1509 33.8468C13.9476 33.7595 13.7637 33.6325 13.61 33.4733L11.2333 31.0983L7.69995 34.6317C7.38722 34.9442 6.96315 35.1197 6.52103 35.1195C6.07891 35.1194 5.65497 34.9436 5.34245 34.6308C5.02994 34.3181 4.85446 33.894 4.85461 33.4519C4.85477 33.0098 5.03055 32.5858 5.34329 32.2733L8.87662 28.74L6.53829 26.4017C6.3791 26.2479 6.25213 26.064 6.16478 25.8607C6.07743 25.6573 6.03146 25.4386 6.02953 25.2173C6.02761 24.996 6.06978 24.7766 6.15358 24.5717C6.23738 24.3669 6.36114 24.1808 6.51763 24.0243C6.67411 23.8679 6.8602 23.7441 7.06503 23.6603C7.26986 23.5765 7.48932 23.5343 7.71062 23.5363C7.93192 23.5382 8.15062 23.5842 8.35396 23.6715C8.5573 23.7588 8.74121 23.8858 8.89495 24.045L11.2333 26.3833L14.2166 23.4C12.5586 21.2263 11.6624 18.5672 11.6666 15.8333ZM24.1666 6.66667C21.7355 6.66667 19.4039 7.63244 17.6848 9.35152C15.9657 11.0706 15 13.4022 15 15.8333C15 18.2645 15.9657 20.5961 17.6848 22.3151C19.4039 24.0342 21.7355 25 24.1666 25C26.5978 25 28.9293 24.0342 30.6484 22.3151C32.3675 20.5961 33.3333 18.2645 33.3333 15.8333C33.3333 13.4022 32.3675 11.0706 30.6484 9.35152C28.9293 7.63244 26.5978 6.66667 24.1666 6.66667Z"/>
      </svg>
    case "drugs":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
        <path d="M9.99992 5H29.9999V8.33333H9.99992V5ZM28.3333 10H11.6666C9.83325 10 8.33325 11.5 8.33325 13.3333V31.6667C8.33325 33.5 9.83325 35 11.6666 35H28.3333C30.1666 35 31.6666 33.5 31.6666 31.6667V13.3333C31.6666 11.5 30.1666 10 28.3333 10ZM26.6666 25H22.4999V29.1667H17.4999V25H13.3333V20H17.4999V15.8333H22.4999V20H26.6666V25Z"/>
      </svg>
    case "events":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
        <path d="M20 9.35L15.4 13.9167L20.9166 19.4333L19.15 21.2L13.6333 15.6833L10.6833 18.6333L16.2 24.15L14.4333 25.9167L8.91663 20.4L5.58329 23.7333C5.05361 24.2464 4.70902 24.9206 4.60346 25.6505C4.49791 26.3803 4.63735 27.1245 4.99996 27.7667L6.66663 30.9167L2.91663 34.7333L5.26663 37.0833L9.08329 33.3333L12.2333 35C12.7413 35.2879 13.316 35.4374 13.9 35.4333C14.3398 35.4337 14.7754 35.347 15.1816 35.1782C15.5878 35.0094 15.9565 34.7619 16.2666 34.45L30.65 20L20 9.35ZM33 15.3333L30.0166 12.3333L32.3833 9.98334L34.7333 12.3333L37.0833 9.98334L30.0166 2.91667L27.6666 5.26667L30.0166 7.63334L27.6666 9.98334L24.6666 7L21.7666 4.08334L19.4166 6.45L21.1333 8.16667V8.18334L31.8166 18.8667H31.8333L33.55 20.5833L35.9166 18.2333L33.0166 15.3333H33Z"/>
      </svg>
    case "production":
      return <svg width="40" height="40" viewBox="0 0 40 40" className={`inline-block ${props.classes}`}>
        <path d="M27.1875 7.46092C25.2575 5.23192 23.0852 3.22476 20.7109 1.47655C20.5008 1.32931 20.2504 1.25034 19.9937 1.25034C19.7371 1.25034 19.4867 1.32931 19.2766 1.47655C16.9066 3.22548 14.7386 5.23262 12.8125 7.46092C8.51719 12.3937 6.25 17.5937 6.25 22.5C6.25 26.1467 7.69866 29.6441 10.2773 32.2227C12.8559 34.8013 16.3533 36.25 20 36.25C23.6467 36.25 27.1441 34.8013 29.7227 32.2227C32.3013 29.6441 33.75 26.1467 33.75 22.5C33.75 17.5937 31.4828 12.3937 27.1875 7.46092ZM28.7266 23.9594C28.4024 25.7698 27.5314 27.4375 26.2307 28.738C24.93 30.0384 23.2621 30.9091 21.4516 31.2328C21.3849 31.2435 21.3175 31.2492 21.25 31.25C20.9364 31.2499 20.6344 31.132 20.4037 30.9196C20.173 30.7073 20.0306 30.4159 20.0046 30.1035C19.9787 29.791 20.0711 29.4802 20.2636 29.2327C20.456 28.9851 20.7345 28.819 21.0437 28.7672C23.6328 28.3312 25.8297 26.1344 26.2687 23.5406C26.3243 23.2136 26.5074 22.9221 26.7779 22.7302C27.0483 22.5383 27.384 22.4616 27.7109 22.5172C28.0379 22.5727 28.3294 22.7558 28.5213 23.0263C28.7133 23.2968 28.7899 23.6324 28.7344 23.9594H28.7266Z"/>
      </svg>
    case "enterprise":
      return <FaCow className={`text-[40px] inline-block ${props.classes}`} />
    case "summary":
      return <FaChartColumn className={`text-[40px] inline-block ${props.classes}`} />
    case "herd":
      return <svg width="40" height="40" viewBox="0 0 160 160"
          preserveAspectRatio="xMidYMid meet" className={`inline-block ${props.classes}`}>
        <g transform="translate(-5.000000,160.000000) scale(0.100000,-0.100000)"
         stroke="none">
        <path d="M553 1447 c-70 -76 -77 -172 -23 -295 18 -40 18 -43 2 -37 -9 4 -42
        10 -73 13 -53 4 -63 1 -142 -42 -47 -26 -105 -50 -129 -54 -65 -11 -63 -37 8
        -101 72 -66 121 -91 209 -105 l70 -12 35 -105 36 -104 74 37 c151 76 377 66
        500 -22 l27 -20 32 98 c17 53 34 102 38 108 5 5 37 15 71 22 84 15 135 41 205
        103 74 66 74 86 -1 105 -30 8 -81 30 -113 49 -84 49 -134 60 -188 42 -39 -14
        -42 -14 -36 1 30 72 45 129 45 169 0 62 -38 143 -80 173 -45 32 -63 19 -68
        -51 -3 -64 -27 -115 -65 -143 -41 -30 -215 -36 -267 -9 -43 22 -80 91 -80 149
        0 87 -27 97 -87 31z"/>
        <path d="M727 619 c-137 -32 -226 -136 -198 -230 45 -150 331 -216 520 -121
        96 48 142 137 111 212 -21 50 -95 108 -168 130 -68 21 -194 26 -265 9z" mask="url(#nosemask)"/>
        </g>
        <mask id="nosemask">
            <rect x="0" y="0" width="1600" height="1600" fill="white" />
            <path d="M670 440 L750 440 C750 440 790 410 750 380 L670 380 C670 380 630 410 670 440 Z" fill="black" />
            <path d="M930 440 L1010 440 C1010 440 1050 410 1010 380 L930 380 C930 380 890 410 930 440 Z" fill="black" />
        </mask>
      </svg>
    case "todraft":
      return <AiOutlineGateway className={`text-[40px] inline-block ${props.classes}`} />
    case "drafted":
      return <IoShieldCheckmark className={`text-[40px] inline-block ${props.classes}`} />
    case "drafts":
      return <svg width="40" height="40" viewBox="0 0 160 160"
        preserveAspectRatio="xMidYMid meet" className={`inline-block ${props.classes}`}>
          <circle cx="20" cy="28" r="12" strokeWidth={12} fill="transparent" />
          <circle cx="140" cy="28" r="12" strokeWidth={12} fill="transparent" />
          <path d="M20 40 L20 60 Z" strokeWidth={12} fill="transparent" />
          <path d="M140 40 L140 60 Z" strokeWidth={12} fill="transparent" />
          <rect x="10" y="60" width="20" height="90" fill="transparent" strokeWidth={12} rx={4} />
          <rect x="130" y="60" width="20" height="90" fill="transparent" strokeWidth={12} rx={4} />
          <rect x="30" y="70" width="100" height="70" fill="transparent" strokeWidth={12} />
          <rect x="55" y="70" width="50" height="70" fill="transparent" strokeWidth={12} />
          <path d="M80 70 L80 140 Z" strokeWidth={12} fill="transparent" />
          <path d="M65 50 C65 50 80 30 95 50" strokeWidth={12} fill="transparent" />
          <path d="M55 35 C55 35 80 10 105 35" strokeWidth={12} fill="transparent" />
      </svg>
  }
}

const Navbar = (props: Props) => {
  const selected = props.selected
  const match = useMatches()
  const currMatch = match[match.length-1].params
  const [savedNavi, setSavedNavi] = useState<{[key: string]: string}>({herduuid: '', edid: ''})

  useEffect(() => {
    const ed = getLocalStore<{id: string, name: string}>('edid')
    setSavedNavi({herduuid: getLocalStore<string>('herdUuid') ?? '', edid: ed?.id ?? ''})
  }, [selected])
  
  return (
    <div className={`flex ${props.stretch ? 'justify-between' : 'gap-2 justify-center'}`}>
      {NAV_ITEMS.filter(ni => !props.hide?.includes(ni.type) && (!ni.enterprise || props.enterprise) && ((!props.isDraft && !ni.easyDraft) || (props.isDraft && ni.easyDraft))).map((l, idx) => 
        <Link to={`/dashboard${l.path}/${(currMatch[l.id ?? ''] || savedNavi[l.id ?? '']) ?? ''}${props.addParams && props.addParams[l.type] ? props.addParams[l.type] : ''}`} tabIndex={-1} key={`Navbar-${idx}`} className={`py-2.5 w-[80px] text-center rounded ${selected === l.type ? 'bg-primary-500' : ''} ${l.hideTablet ? ' hidden lg:block ' : ''} ${l.hideMobile ? ' hidden sm:block' : ''}`}>
          <NavIcons type={l.type} classes={selected !== l.type ? 'fill-primary-500 stroke-primary-500' : 'fill-white stroke-white'} />
          <span className={`block font-opensans ${selected === l.type ? 'text-white' : 'text-primary-500'}`}>{l.name}</span>
        </Link>
      )}
    </div>
  );
};

export default Navbar;
