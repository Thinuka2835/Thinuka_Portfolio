import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { get, onUnauthorized, post } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // status: loading | signedOut | signedIn
  const [state, setState] = useState({ status: 'loading', user: null, session: null, notice: null })

  useEffect(() => {
    get('/auth/session')
      .then(({ user, session }) => setState({ status: 'signedIn', user, session, notice: null }))
      .catch((err) =>
        setState({
          status: 'signedOut',
          user: null,
          session: null,
          notice: err.status === 401 ? null : err.message,
        })
      )
  }, [])

  // Any 401 from any request → back to the sign-in screen with an explanation
  useEffect(
    () =>
      onUnauthorized(() =>
        setState((s) =>
          s.status === 'signedIn'
            ? { status: 'signedOut', user: null, session: null, notice: 'Your session expired. Please sign in again.' }
            : s
        )
      ),
    []
  )

  const login = useCallback(async (email, password) => {
    const { user } = await post('/auth/login', { email, password })
    const { session } = await get('/auth/session')
    setState({ status: 'signedIn', user, session, notice: null })
  }, [])

  const logout = useCallback(async (everywhere = false) => {
    try {
      await post(everywhere ? '/auth/logout-all' : '/auth/logout')
    } finally {
      setState({ status: 'signedOut', user: null, session: null, notice: 'You have been signed out.' })
    }
  }, [])

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
