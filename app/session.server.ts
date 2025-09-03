import { createCookie, createCookieSessionStorage, redirect } from "@remix-run/node";
import { isIP } from "is-ip";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__ed_session",
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secrets: ["eAsyda!ry"],
    secure: process.env.NODE_ENV === "production",
  },
});
const refreshTokenStorage = createCookieSessionStorage({
  cookie: {
    name: "__ed_sessionRefresh",
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secrets: ["eAsyda!ryRef"],
    secure: process.env.NODE_ENV === "production",
  },
});
export const updateSettingsCookie = createCookie('__ed_lastUpdate', {
  maxAge: 365 * 24* 60 * 60
})

async function getSession(request: Request, type = 'session') {
    const cookie = request.headers.get("Cookie");
    return type === 'refresh' ? refreshTokenStorage.getSession(cookie) : sessionStorage.getSession(cookie);
}

export async function logout(request: Request) {
  const session = await getSession(request);
  const refresh = await getSession(request, 'refresh');
  const cookieName = refresh.get('refreshCookie')
  let headers: {[key: string]: string} = {
    "Cookie": `${cookieName}=${refresh.get(cookieName)}`
  }
  const ip = getClientIP(request)
  if (ip) {
    headers['easydairy-client-ip'] = ip
    headers['easydairy-private-token'] = process.env.EASYDAIRY_PRIVATE_TOKEN!
  }
  const resp = await fetch(`${process.env.BASE_URL}/api/auth/revoke-token`, {
    method: 'POST',
    headers: headers,
  })
  if (resp.status !== 200) {
    console.error('Token Revoke Failed', resp.status)
  }

  return redirect("/", {
    headers: [
      ["Set-Cookie", await sessionStorage.destroySession(session)],
      ["Set-Cookie", await refreshTokenStorage.destroySession(refresh)],
      ["Set-Cookie", await updateSettingsCookie.serialize("", { maxAge: 1 })],
    ],
  });
}

export async function createUserSession({
  request,
  refreshToken,
  cookieName,
  accessToken,
  duration,
  refreshDuration
}: {
  request: Request;
  refreshToken: string;
  cookieName: string;
  accessToken: string;
  duration?: number;
  refreshDuration?: number;
}) {
  let response: {[key: string]: any} = {}
  const session = await getSession(request);
  const refresh = await getSession(request, 'refresh');
  const maxAge = duration ?? (60 * 60 * 24 * 30)
  try {
    refresh.set(cookieName, refreshToken);
    refresh.set("refreshCookie", cookieName);
    session.set("accessToken", accessToken);
    session.set("maxAge", maxAge)
    const resp = await fetch(`${process.env.BASE_URL}/api/account`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    response = await resp.json();
    if (response) {
      const {Reports, Herds, AnimalPageConfig, ...userInfo} = response
      session.set("userData", userInfo)
    }
  } catch (e) {
    return {
      data: {
        success: false,
        message: 'Failed to generate user session'
      }
    }
  }

  return {
    data: {
      success: true,
      userData: response,
    },
    headers: {
      headers: [
        ["Set-Cookie", await sessionStorage.commitSession(session, {
          maxAge: maxAge
        })],
        ["Set-Cookie", await refreshTokenStorage.commitSession(refresh, {
          maxAge: refreshDuration ?? (60 * 60 * 24 * 365)
        })]
      ]
    },
  };
}

export async function createAppUserSession({
  request,
  accessToken,
  duration,
}: {
  request: Request;
  accessToken: string;
  duration?: number;
}) {
  let response: {[key: string]: any} = {}
  const session = await getSession(request);
  const maxAge = duration ?? (60 * 60 * 24 * 30)
  try {
    session.set("accessToken", accessToken);
    session.set("isApp", true);
    session.set("maxAge", maxAge)
    const resp = await fetch(`${process.env.BASE_URL}/api/account`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    response = await resp.json();
    if (response) {
      const {Reports, Herds, ...userInfo} = response
      session.set("userData", userInfo)
    }
  } catch (e) {
    return {
      data: {
        success: false,
        message: 'Failed to generate user session'
      }
    }
  }

  return {
    data: {
      success: true,
      userData: response,
    },
    headers: {
      headers: [
        ["Set-Cookie", await sessionStorage.commitSession(session, {
          maxAge: maxAge
        })],
      ]
    },
  };
}

export async function invalidateUserHeaders(request: Request) {
  const session = await getSession(request);
  return {
    "Set-Cookie": await sessionStorage.destroySession(session, {
      maxAge: -99999999,
    }),
  }
}

export async function getUserAccessToken(
    request: Request,
    redirectIfLoggedIn?: boolean
  ): Promise<{accessToken: string, userData: {[key: string]: any}, isApp?: boolean, headers?: {[key: string]: {[key: string]: string}}}> {
    const session = await getSession(request);
    const userToken = session.get("accessToken")
    let userData = session.get("userData")
    const isApp = !!session.get("isApp");
    if (userToken && userData) {
      return {accessToken: userToken, userData, isApp};
    } else {
      const sessionRefresh = await getSession(request, 'refresh');
      const refreshCookie = sessionRefresh.get("refreshCookie")
      const refreshToken = sessionRefresh.get(refreshCookie)
      if (!refreshToken) {
        if (redirectIfLoggedIn) {
          throw await logout(request);
        }
        return Promise.resolve({accessToken: "", userData: {}})
      } else {
        let refreshHeaders: {[key: string]: string} = {
          "Content-Type": "application/json",
          "Cookie": `${refreshCookie}=${refreshToken}`
        }
        const ip = getClientIP(request)
        if (ip) {
          refreshHeaders['easydairy-client-ip'] = ip
          refreshHeaders['easydairy-private-token'] = process.env.EASYDAIRY_PRIVATE_TOKEN!
        }
        const resp = await fetch(`${process.env.BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: refreshHeaders,
        })
        if (resp.status === 200) {
          const response = await resp.json()
          const maxAge = response.accessTokenExpiration - Math.round(Date.now()/1000)
          session.set("accessToken", response.accessToken)
          session.set("maxAge", maxAge)
          if (isApp) {
            session.set("isApp", true)
          }
          const userResp = await fetch(`${process.env.BASE_URL}/api/account`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${response.accessToken}`,
            },
          });
          const userResponse = await userResp.json();
          if (userResponse) {
            session.set("userData", userResponse)
            userData = userResponse
          } else {
            throw await logout(request);
          }
          return {accessToken: response.accessToken, userData: userData, isApp, headers: {headers: {
            "Set-Cookie": await sessionStorage.commitSession(session, {
            maxAge: maxAge
          })}}}
        } else if (redirectIfLoggedIn) {
          throw await logout(request);
        }
        return Promise.resolve({accessToken: "", userData: {}, isApp: false})
      }
    }
}

export async function getUserData(request: Request) {
  const token = await getUserAccessToken(request, true);
  return {data: token.userData, headers: token.headers}
}

export async function updateUserData(request: Request, newData: Record<string, any>) {
  const session = await getSession(request);
  let userData = session.get("userData")
  const maxAge = session.get("maxAge")
  session.set("userData", {...userData, ...newData})
  return {headers: {
    "Set-Cookie": await sessionStorage.commitSession(session, {
    maxAge: maxAge
  })}}
}

const headersList = [
  "X-Client-IP",
	"X-Forwarded-For",
	"HTTP-X-Forwarded-For",
	"Fly-Client-IP",
	"CF-Connecting-IP",
	"Fastly-Client-Ip",
	"True-Client-Ip",
	"X-Real-IP",
	"X-Cluster-Client-IP",
	"X-Forwarded",
	"Forwarded-For",
	"Forwarded"
]

function getClientIP(request: Request) {
  let ipAddress = headersList.flatMap((header) => {
    let val = request.headers.get(header.toLowerCase())
    if (header === "Forwarded") {
      return parseForwardedHeader(val);
    }
    if (!val?.includes(",")) return val;
		return val.split(",").map((ip) => ip.trim());
  }).find((ip) => {
    if (ip === null) return false;
		return isIP(ip);
  })
  return ipAddress ?? null
}

function parseForwardedHeader(value: string | null): string | null {
	if (!value) return null;
	for (let part of value.split(";")) {
		if (part.startsWith("for=")) return part.slice(4);
		continue;
	}
	return null;
}

export async function verifyLogin(username: string, password: string, request:Request) {
  let headers: {[key: string]: string} = {
    "Content-Type": "application/json",
  }
  const ip = getClientIP(request)
  if (ip) {
    headers['easydairy-client-ip'] = ip
    headers['easydairy-private-token'] = process.env.EASYDAIRY_PRIVATE_TOKEN!
  }
  const resp = await fetch(`${process.env.BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({username, password})
  })
  try {
    if (resp.status !== 200) {
      const data = await resp.json()
      switch (resp.status) {
        case 401:
          return {error: {password: data?.message}}
        case 400:
          return {error: {username: data?.message}}
      }
      return {error: {message: data?.message}}
    }
    const setcookieData: string[] = resp.headers.get("Set-Cookie")?.split("; ") ?? []
    const response = await resp.json()

    // Check if user needs to force change password
    if (response.mode === "force_password_change" || response.requirePasswordChange) {
      let cookies = {
        accessToken: {value: response.accessToken, duration: response.accessTokenExpiration - Math.round(Date.now()/1000)},
        refreshToken: {value: "", duration: 0, name: ""}
      }
      setcookieData.forEach((scd, idx) => {
        const fields = scd.split('=')
        if (idx === 0) {
          cookies.refreshToken.value = fields[1]
          cookies.refreshToken.name = fields[0]
        } else if (fields[0] === "expires") {
          cookies.refreshToken.duration = Math.round((new Date(fields[1]).valueOf() - Date.now())/1000)
        }
      })

      return {
        ...cookies,
        requirePasswordChange: true
      };
    }

    let cookies = {
      accessToken: {value: response.accessToken, duration: response.accessTokenExpiration - Math.round(Date.now()/1000)},
      refreshToken: {value: "", duration: 0, name: ""}
    }
    setcookieData.forEach((scd, idx) => {
      const fields = scd.split('=')
      if (idx === 0) {
        cookies.refreshToken.value = fields[1]
        cookies.refreshToken.name = fields[0]
      } else if (fields[0] === "expires") {
        cookies.refreshToken.duration = Math.round((new Date(fields[1]).valueOf() - Date.now())/1000)
      }
    })

    return cookies;
  } catch (e) {
    return {error: {message: "Error occurred during login"}}
  }
}

type CallApiMethod = "GET" | "POST" | "PUT"| "DELETE" | "PATCH";
export async function callAPI<T>(
  request: Request,
  url: string,
  body?: string | { [key: string]: any },
  method: CallApiMethod = 'POST',
  accessTokenOverride?: string,
  contentType?: string
): Promise<({
  success: true,
  response: T,
} | {
  success: false,
  response: {errors: unknown}
})
  &
{
  headers?: {[key: string]: {[key: string]: string}}
}> {
  let accessToken = ''
  let headers
  if (accessTokenOverride) {
    accessToken = accessTokenOverride
  } else {
    ({ accessToken, headers } = await getUserAccessToken(request, true))
  }
  const resp = await fetch(`${process.env.BASE_URL}${url}`, {
    method: method,
    headers: {
      'Content-Type': contentType ?? 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: contentType?.includes('multipart/form-data') ? request.body : (typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined)),
  });
  try {
    const response = await resp.json();
    if (resp.status === 200) {
      return { success: true, response, headers };
    } else if (resp.status === 401 && response.data?.tokenStatus === 'inactive') {
      console.log('inactive account', response.data);
      throw new Error('inactive account')
    } else {
      console.log('API error', response)
      return { success: false, response: {...response, errors: response.message} };
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'inactive account') {
      throw await logout(request);
    }
    return {response: {errors: e}, success: false}
  }
}
