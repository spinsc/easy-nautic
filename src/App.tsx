import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Perfil from './pages/Perfil'
import Embarcacoes from './pages/Embarcacoes'
import EmbarcacaoFicha from './pages/EmbarcacaoFicha'
import EmbarcacaoPublica from './pages/EmbarcacaoPublica'
import Chamados from './pages/Chamados'
import Admin from './pages/Admin'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (carregando) return null

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/b/:tagId" element={<EmbarcacaoPublica />} />
        <Route path="/login" element={session ? <Navigate to="/perfil" /> : <Login />} />
        <Route path="/cadastro" element={session ? <Navigate to="/perfil" /> : <Cadastro />} />
        <Route path="/perfil" element={session ? <Perfil /> : <Navigate to="/login" />} />
        <Route path="/embarcacoes" element={session ? <Embarcacoes /> : <Navigate to="/login" />} />
        <Route path="/embarcacoes/:id" element={session ? <EmbarcacaoFicha /> : <Navigate to="/login" />} />
        <Route path="/chamados" element={session ? <Chamados /> : <Navigate to="/login" />} />
        <Route path="/admin" element={session ? <Admin /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
