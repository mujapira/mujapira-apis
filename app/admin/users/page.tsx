'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth/auth-context'
import { User } from '@/contexts/auth/types'
import { _getAllUsers, _promoteUserByEmail } from '@/services/user'

// shadcn/ui
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

const WINDOW_MS = 2500

export default function UsersViewer() {
  const { currentUser } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [loadingPage, setLoadingPage] = useState<boolean>(true)
  const [hasFetched, setHasFetched] = useState<boolean>(false)
  const [errorPage, setErrorPage] = useState<string | null>(null)

  const [clicks, setClicks] = useState<Record<string, number>>({})
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})
  const [promoting, setPromoting] = useState<Record<string, boolean>>({})

  async function load(signal?: AbortSignal) {
    if (!currentUser) return
    setLoadingPage(true)
    setErrorPage(null)
    try {
      const data = await _getAllUsers()
      if (signal?.aborted) return
      setUsers(data)
    } catch (e: any) {
      if (signal?.aborted) return
      setErrorPage(e?.message ?? 'Falha ao carregar usuários')
    } finally {
      if (!signal?.aborted) {
        setHasFetched(true)
        setLoadingPage(false)
      }
    }
  }

  useEffect(() => {
    const ctrl = new AbortController()
    if (currentUser) load(ctrl.signal)

    return () => {
      ctrl.abort()
      Object.values(timersRef.current).forEach(t => t && clearTimeout(t))
    }
  }, [currentUser])

  const showEmpty = useMemo(
    () => hasFetched && !loadingPage && users.length === 0 && !errorPage,
    [hasFetched, loadingPage, users.length, errorPage]
  )

  function resetClicks(email: string) {
    setClicks(prev => {
      const { [email]: _, ...rest } = prev
      return rest
    })
    const t = timersRef.current[email]
    if (t) clearTimeout(t)
    timersRef.current[email] = undefined
  }

  async function handleEmailClick(emailRaw: string, alreadyAdmin: boolean) {
    const email = (emailRaw || '').toLowerCase()
    if (!email || alreadyAdmin || promoting[email]) return

    // incrementa de forma determinística e avalia o limiar sem race
    let nextCount = 0
    setClicks(prev => {
      nextCount = (prev[email] ?? 0) + 1
      return { ...prev, [email]: nextCount }
    })

    // reinicia janela deslizante
    const prevTimer = timersRef.current[email]
    if (prevTimer) clearTimeout(prevTimer)
    timersRef.current[email] = setTimeout(() => resetClicks(email), WINDOW_MS)

    if (nextCount >= 5) {
      resetClicks(email)
      setPromoting(p => ({ ...p, [email]: true }))
      try {
        await _promoteUserByEmail(email)
        setUsers(prev => prev.map(u =>
          (u.email ?? '').toLowerCase() === email ? ({ ...u, isAdmin: true } as User) : u
        ))
      } finally {
        setPromoting(p => ({ ...p, [email]: false }))
      }
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Usuários</h1>

      {/* Loading */}
      {loadingPage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-[240px]" />
                <Skeleton className="h-4 w-[280px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {errorPage && !loadingPage && (
        <div className="text-sm text-destructive">{errorPage}</div>
      )}

      {/* Empty */}
      {showEmpty && (
        <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
      )}

      {/* Table */}
      {!loadingPage && users.length > 0 && (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {users.map(u => {
                  const email = (u.email ?? '').toLowerCase()
                  const isAdm = !!u.isAdmin
                  const isBusy = !!promoting[email]
                  const clickCount = clicks[email] ?? 0

                  return (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell
                        className={`select-none ${isAdm ? 'text-muted-foreground' : 'cursor-pointer'}`}
                        onClick={() => handleEmailClick(email, isAdm)}
                        title={isAdm ? '' : 'Clique 5x em 2,5s para promover'}
                      >
                        <span>{u.email}</span>
                        {isBusy && (
                          <span className="ml-2 text-xs text-muted-foreground align-middle">
                            promovendo…
                          </span>
                        )}
                        {!isAdm && clickCount > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {clickCount}/5
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{isAdm ? 'Sim' : 'Não'}</TableCell>
                      <TableCell className="text-right" />
                    </TableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
