import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import ForgotPasswordForm from '@/components/ui/app_components/forget_password_form'
// import Logo from '@/components/shadcn-studio/logo'

const ForgotPassword = () => {
  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10 lg:px-8'>
      <div className='absolute'>
        {/* <AuthBackgroundShape /> */}
      </div>

      <Card className='z-1 w-full max-w-md border-none shadow-md'>
        <CardHeader className='gap-4 sm:gap-6'>
          {/* <Logo className='gap-3' /> */}

          <div>
            <CardTitle className='mb-1.5 text-xl sm:text-2xl'>Forgot Password?</CardTitle>
            <CardDescription className='text-sm sm:text-base'>
              Enter your email and we&apos;ll send you a verification code to reset your password
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-4 px-4 pb-5 sm:px-6 sm:pb-6'>
          {/* ForgotPassword Form */}
          <ForgotPasswordForm />

          <Link href='/login' className='group mx-auto flex w-fit items-center gap-2 text-sm sm:text-base'>
            <ChevronLeftIcon className='size-5 transition-transform duration-200 group-hover:-translate-x-0.5' />
            <span>Back to login</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword
