import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificacoesApi } from '@/api/notificacoes.api'
import { qk } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AvisoNotificacoesLogin() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const loginNonce = useAuthStore((state) => state.loginNonce)
  const [aberto, setAberto] = useState(false)
  const nonceExibido = useRef<number | null>(null)

  const { data: resumo } = useQuery({
    queryKey: qk.notificacoes.resumo,
    queryFn: () => notificacoesApi.resumo(),
    enabled: !!user && !!loginNonce,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (
      loginNonce &&
      loginNonce !== nonceExibido.current &&
      (resumo?.importantesNaoLidas ?? 0) > 0
    ) {
      nonceExibido.current = loginNonce
      setAberto(true)
    }
  }, [loginNonce, resumo?.importantesNaoLidas])

  if (!loginNonce) return null

  const abrirCentral = () => {
    setAberto(false)
    navigate('/perfil?aba=notificacoes&filtro=nao_lidas&importantes=true')
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Mensagens importantes
          </DialogTitle>
          <DialogDescription>
            Você tem {resumo?.importantesNaoLidas ?? 0} mensagem(ns) importante(s) não lida(s).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>Agora não</Button>
          <Button onClick={abrirCentral}>Ver mensagens</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
