'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

const ForgotPasswordForm = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/email-otp/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const payload = (await response.json()) as { message?: string }

      if (!response.ok) {
        setError(payload?.message || 'Failed to send OTP. Please try again.')
        return
      }

      setMessage('If this email exists, an OTP has been sent.')
      router.push(`/verify_login?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      {/* Email */}
      <div className='space-y-1'>
        <Label className='leading-5' htmlFor='userEmail'>
          Email address*
        </Label>
        <Input
          type='email'
          id='userEmail'
          placeholder='Enter your email address'
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      {error && <p className='text-sm leading-5 text-red-500'>{error}</p>}
      {message && <p className='text-sm leading-5 text-green-600'>{message}</p>}

      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? 'Sending...' : 'Send code'}
      </Button>
    </form>
  )
}

export default ForgotPasswordForm
