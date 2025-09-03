  import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
  import { Form, useNavigate, useActionData } from '@remix-run/react';
  import { useState, useEffect} from 'react';
  import Input from '~/components/ui/Input';
  import Button from '~/components/ui/Button';
  import BottomBanner from '~/components/BottomBanner';
  import { callAPI, createUserSession, getUserAccessToken, verifyLogin, registerUser } from '~/session.server';
  import SelectDropdown from '~/components/ui/Dropdown';
  import dlogo from '~/images/dlogo.png';
  import { loginSchema, signupSchema } from '~/lib/string';
  import { Toast, toastInfo } from '~/components/Toast';

  function getUserRedirect(user: Record<string, any>) {
    return '/dashboard/drafts';
  }

  export async function loader({ request }: LoaderFunctionArgs) {
    const { accessToken, userData, headers } = await getUserAccessToken(request);
    if (accessToken && userData) {
      if (userData.Role === 'user') {
        return redirect(getUserRedirect(userData), headers);
      }
      return redirect(userData.Role === 'admin' ? '/admin' : '/dashboard', headers);
    }
    return json(null, headers);
  }

  export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const mode = (formData.get('mode') || 'login').toString();

    if (mode === 'signup') {
      const data = {
        email: (formData.get('email') || '').toString().trim(),
        firstName: (formData.get('firstName') || '').toString().trim(),
        lastName: (formData.get('lastName') || '').toString().trim(),
        businessName: (formData.get('businessName') || '').toString().trim(),
        heatSystem: (formData.get('heatSystem') || '').toString(),
        password: (formData.get('password') || '').toString(),
        confirmPassword: (formData.get('confirmPassword') || '').toString(),
      };

      // Use Zod schema for validation
      const validation = signupSchema.safeParse(data);
      let fieldErrors: Record<string, string> = {};

      if (!validation.success) {
        fieldErrors = validation.error.flatten().fieldErrors as Record<string, string>;
      }

      if (Object.keys(fieldErrors).length > 0) {
        return json({ mode, fieldErrors, message: 'Please correct the errors' }, { status: 400 });
      }
      const apiRes = await registerUser<any>(
        request,
        '/api/auth/publicRegister',
        {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          businessName: data.businessName,
          heatSystem: data.heatSystem,
          password: data.password,
        },
        'POST'
      );

      if (!apiRes.success) {
        // Access the response object for error details
        const apiResponse = apiRes.response as { errors: unknown; message?: string };
        const backendMessage = apiResponse.message || 'Signup failed. Please try again.';

        let apiFieldErrors: Record<string, string> = {};
        if (backendMessage.includes('Email')) {
          apiFieldErrors.email = 'Email already in use';
        }
        if (backendMessage.includes('business name')) {
          apiFieldErrors.businessName = 'Business name is already in use';
        }

        return json(
          {
            mode,
            fieldErrors: apiFieldErrors,
            message: backendMessage,
          },
          { status: 400 }
        );
      }
      // Success
      return json({
        mode,
        status: 'ok',
        message: apiRes.response?.message || 'Your Account Created Successfully.',
      });
    }

    // LOGIN
    const data = {
      email: (formData.get('email') || '').toString().trim(),
      password: (formData.get('password') || '').toString(),
    };

    const validation = loginSchema.safeParse(data);
    let fieldErrors: Record<string, string> = {};
    if (!validation.success) {
      fieldErrors = validation.error.flatten().fieldErrors as Record<string, string>;
      return json({ mode, fieldErrors, message: 'Please correct the errors' }, { status: 400 });
    }

    const verified = await verifyLogin(data.email, data.password, request);
    if ('error' in verified) {
      const err: any = (verified as any).error || {};
      if (err.username) {
        fieldErrors.email = String(err.username).replace(/username/gi, 'email');
      }
      if (err.password) {
        fieldErrors.password = String(err.password).replace(/username/gi, 'email');
      }
      const message = err.message ? String(err.message).replace(/username/gi, 'email') : 'Login failed';
      return json({ mode, fieldErrors, message }, { status: 401 });
    }

    // Pre-check role BEFORE committing any session cookies
    const accountRes = await callAPI<any>(request, '/api/account', undefined, 'GET', verified.accessToken.value);
    if (!accountRes.success) {
      return json({ mode, fieldErrors, message: 'Failed to verify account' }, { status: 401 });
    }
    const userData = accountRes.response;
    if (userData?.Role !== 'user' || userData?.EasyDraftUser !== true) {
      return json({ mode, fieldErrors, message: 'Only EasyDraftUser can sign in here.' }, { status: 401 });
    }

    const resp = await createUserSession({
      request,
      refreshToken: verified.refreshToken.value,
      cookieName: verified.refreshToken.name,
      accessToken: verified.accessToken.value,
      duration: verified.accessToken.duration,
      refreshDuration: verified.refreshToken.duration,
    });

    const user = resp.data?.userData;
    if (!user) {
      return redirect('/dashboard/drafts', resp.headers as ResponseInit);
    }
    return redirect(getUserRedirect(user as Record<string, any>), resp.headers as ResponseInit);
  }

  export default function UserLogin() {
    const resp = useActionData<{
      message?: string;
      mode?: string;
      fieldErrors?: Record<string, string>;
    }>();
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>(resp?.mode === 'signup' ? 'signup' : 'login');
    const [selectedHeatSystem, setSelectedHeatSystem] = useState<string>('');
    const HEAT_SYSTEMS = [
      { label: 'CowManager', value: 'CowManager' },
      { label: 'Datamars', value: 'Datamars' },
      { label: 'Halter', value: 'Halter' },
      { label: 'HeatTime', value: 'HeatTime' },
      { label: 'Nedap', value: 'Nedap' },
      { label: 'smaXtec', value: 'smaXtec' },
    ];
    useEffect(() => {
      if (resp?.mode === 'signup' && resp?.message) {
        toastInfo({
          title: 'Signup Successful',
          message: resp.message,
        });
       setActiveTab('login');
      }
    }, [resp]);

    return (
      <>
        <Toast />
        <div className='flex flex-col min-h-screen justify-center'>
          <div className='flex-grow flex-col flex items-center justify-center space-y-8 px-4 sm:px-6 lg:px-8'>
            <div className='text-center'>
              <img src={dlogo} alt='Easy Dairy Logo' className='mx-auto md:h-18 md:w-35 w-20 h-20' />
            </div>
            <div>
              <h2 className='text-center text-black font-semibold md:text-4xl xs:text-3xl text-2xl font-signika'>
                EasyDraft
              </h2>
              <h6 className='mt-2 text-center xs:text-base text-black text-md font-normal font-opensans'>
                Access your Easy Draft Account
              </h6>
            </div>
            <div className='w-full max-w-md'>
              {/* Tab Buttons */}
              <div className='flex border-b border-gray-300'>
                <button
                  type='button'
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2 font-semibold border-b-2 ${
                    activeTab === 'login'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type='button'
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-2 font-semibold border-b-2 ${
                    activeTab === 'signup'
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {activeTab === 'login' && (
                <Form className='space-y-3 mx-auto text-sm xs:min-w-[290px] min-w-0 pb-3 mt-4' method='post'>
                  <input type='hidden' name='mode' value='login' />
                  <div className='md:mt-1 mt-1 flex flex-col'>
                    <div className='w-full mt-1'>
                      <Input
                        id='email'
                        name='email'
                        type='email'
                        label='Email'
                        required
                        placeholder='Enter your email'
                        className='text-sm rounded'
                        error={resp?.fieldErrors?.email ?? ''}
                      />
                    </div>
                    <div className='w-full mt-4'>
                      <Input
                        id='password'
                        name='password'
                        type='password'
                        label='Password'
                        required
                        placeholder='Enter your password'
                        error={resp?.fieldErrors?.password ?? ''}
                      />
                    </div>
                  </div>
                  {resp?.message && resp?.mode === 'login' && (
                    <p className='mt-2 text-error-500 text-sm text-center'>{resp.message}</p>
                  )}
                  <div>
                    <Button type='submit' className='text-lg w-full mt-2 font-bold'>
                      Login
                    </Button>
                  </div>
                  <div className='text-center mt-2'>
                    <a
                      href='password/forgot'
                      className='text-sm text-primary-500 underline underline-offset-1 font-semibold'
                    >
                      Forgot Password?
                    </a>
                  </div>
                </Form>
              )}

              {activeTab === 'signup' && (
                <Form className='space-y-3 mx-auto xs:min-w-[290px] min-w-0 pb-3 mt-3' method='post'>
                  <input type='hidden' name='mode' value='signup' />

                  <div className='w-full'>
                    <Input
                      id='email'
                      name='email'
                      type='email'
                      label='Email Address'
                      required
                      placeholder='Email Address'
                      error={resp?.fieldErrors?.email ?? ''}
                    />
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                      <Input
                        id='firstName'
                        name='firstName'
                        type='text'
                        label='First Name'
                        required
                        placeholder='First Name'
                        error={resp?.fieldErrors?.firstName ?? ''}
                      />
                    </div>
                    <div>
                      <Input
                        id='lastName'
                        name='lastName'
                        type='text'
                        label='Last Name'
                        required
                        placeholder='Last Name'
                        error={resp?.fieldErrors?.lastName ?? ''}
                      />
                    </div>
                    <div>
                      <Input
                        id='businessName'
                        name='businessName'
                        type='text'
                        label='Business Name'
                        required
                        placeholder='Business Name'
                        error={resp?.fieldErrors?.businessName ?? ''}
                      />
                    </div>
                    <div>
                      <label className='block text-md font-semibold mb-1.5'>Heat Detection System</label>
                      <SelectDropdown
                        type='single'
                        value={selectedHeatSystem}
                        options={HEAT_SYSTEMS}
                        onSelectChange={(opt) => {
                          setSelectedHeatSystem(opt.value as string);
                        }}
                      />
                      <input id='heatSystemHidden' name='heatSystem' type='hidden' value={selectedHeatSystem} />
                      {resp?.fieldErrors?.heatSystem && (
                        <p className='text-error-500 text-xs mt-1'>{resp.fieldErrors.heatSystem}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        id='password'
                        name='password'
                        type='password'
                        label='Password'
                        required
                        placeholder='Password'
                        error={resp?.fieldErrors?.password ?? ''}
                      />
                    </div>
                    <div>
                      <Input
                        id='confirmPassword'
                        name='confirmPassword'
                        type='password'
                        label='Confirm Password'
                        required
                        placeholder='Confirm Password'
                        error={resp?.fieldErrors?.confirmPassword ?? ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Button type='submit' className='text-lg w-full font-bold'>
                      Create Account
                    </Button>
                  </div>
                </Form>
              )}
            </div>
          </div>

          <BottomBanner />
        </div>
      </>
    );
  }
