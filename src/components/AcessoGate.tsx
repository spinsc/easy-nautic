import { useEffect, useState, type ReactNode } from 'react'
import {
  getMeuPrestador,
  getTermosVigente,
  jaAceitouTermos,
  aceitarTermos,
  updatePrestador,
  uploadDocumentoPrestador,
} from '@/lib/api'
import { mensagemErro } from '@/lib/errors'
import { CampoTexto } from '@/components/campos'
import type { Prestador, TermosUso } from '@/types'

type Etapa = 'carregando' | 'termos' | 'completar_pj' | 'liberado'

export function AcessoGate({ children }: { children: ReactNode }) {
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [prestador, setPrestador] = useState<Prestador | null>(null)
  const [termos, setTermos] = useState<TermosUso | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function verificar() {
    setErro(null)
    try {
      const [p, t] = await Promise.all([getMeuPrestador(), getTermosVigente()])
      setPrestador(p)
      setTermos(t)

      if (t) {
        const aceitou = await jaAceitouTermos(t.id)
        if (!aceitou) {
          setEtapa('termos')
          return
        }
      }

      if (p && p.tipo_pessoa === 'PJ' && (!p.representante_legal || p.documentos_verificacao.length === 0)) {
        setEtapa('completar_pj')
        return
      }

      setEtapa('liberado')
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao verificar acesso'))
    }
  }

  useEffect(() => {
    verificar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (etapa === 'carregando') return <p className="p-8 text-sm text-slate-400">Carregando…</p>

  if (etapa === 'termos' && termos) {
    return <TelaAceiteTermos termos={termos} erro={erro} onAceitar={verificar} />
  }

  if (etapa === 'completar_pj' && prestador) {
    return <TelaCompletarPJ prestador={prestador} erro={erro} onCompleto={verificar} />
  }

  return <>{children}</>
}

function TelaAceiteTermos({ termos, erro, onAceitar }: { termos: TermosUso; erro: string | null; onAceitar: () => void }) {
  const [li, setLi] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  async function aceitar() {
    setEnviando(true)
    setErroLocal(null)
    try {
      await aceitarTermos(termos.id)
      onAceitar()
    } catch (e) {
      setErroLocal(mensagemErro(e, 'Erro ao registrar aceite'))
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col p-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
      <h1 className="mb-4 font-display text-2xl text-slate-900">Termos de uso</h1>
      <p className="mb-4 text-sm text-slate-500">
        Pra continuar usando a plataforma, é preciso ler e aceitar a versão vigente dos termos de uso (v{termos.versao}).
      </p>

      {(erro || erroLocal) && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro || erroLocal}
        </div>
      )}

      <div className="mb-4 max-h-[50vh] flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {termos.conteudo}
      </div>

      <label className="mb-4 flex items-start gap-2 text-sm text-slate-900">
        <input
          type="checkbox"
          checked={li}
          onChange={(e) => setLi(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-tide-700 focus:ring-tide-500"
        />
        Li e concordo com os termos de uso acima. Se estou aceitando em nome de uma empresa, declaro ter poderes de
        representação para isso.
      </label>

      <button
        onClick={aceitar}
        disabled={!li || enviando}
        className="w-full rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
      >
        {enviando ? 'Registrando…' : 'Aceitar e continuar'}
      </button>
    </div>
  )
}

function TelaCompletarPJ({
  prestador,
  erro,
  onCompleto,
}: {
  prestador: Prestador
  erro: string | null
  onCompleto: () => void
}) {
  const [representante, setRepresentante] = useState(prestador.representante_legal ?? '')
  const [enviandoDoc, setEnviandoDoc] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [documentos, setDocumentos] = useState(prestador.documentos_verificacao)

  async function enviarDocumento(file: File) {
    setEnviandoDoc(true)
    setErroLocal(null)
    try {
      const doc = await uploadDocumentoPrestador(prestador.id, file)
      const novaLista = [...documentos, doc]
      await updatePrestador(prestador.id, { documentos_verificacao: novaLista })
      setDocumentos(novaLista)
    } catch (e) {
      setErroLocal(mensagemErro(e, 'Erro ao enviar documento'))
    } finally {
      setEnviandoDoc(false)
    }
  }

  async function salvar() {
    if (!representante.trim() || documentos.length === 0) return
    setSalvando(true)
    setErroLocal(null)
    try {
      await updatePrestador(prestador.id, { representante_legal: representante.trim() })
      onCompleto()
    } catch (e) {
      setErroLocal(mensagemErro(e, 'Erro ao salvar'))
      setSalvando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-tide-600">Easy Nautic</p>
      <h1 className="mb-2 font-display text-2xl text-slate-900">Complete o cadastro da empresa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Como pessoa jurídica, precisamos do nome de quem representa legalmente a empresa e de um documento (ex:
        contrato social) pra conferir antes de liberar o uso da plataforma. Um administrador confere o documento
        depois — enquanto isso, o cadastro fica pendente, mas você já pode continuar.
      </p>

      {(erro || erroLocal) && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro || erroLocal}
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <CampoTexto label="Nome do representante legal" value={representante} onChange={setRepresentante} required />

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-900">Documento (contrato social ou equivalente)</span>
          {documentos.length > 0 && (
            <ul className="mb-2 space-y-1">
              {documentos.map((doc, i) => (
                <li key={i} className="text-xs text-emerald-700">
                  ✓ {doc.nome_arquivo}
                </li>
              ))}
            </ul>
          )}
          <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-tide-500">
            {enviandoDoc ? 'Enviando…' : '+ Anexar documento'}
            <input
              type="file"
              className="hidden"
              disabled={enviandoDoc}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) enviarDocumento(file)
              }}
            />
          </label>
        </div>

        <button
          onClick={salvar}
          disabled={!representante.trim() || documentos.length === 0 || salvando}
          className="w-full rounded-md bg-tide-700 px-4 py-2 text-sm font-medium text-white hover:bg-tide-800 disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
