import { Navigate } from 'react-router-dom'

/**
 * CadastrosApoio redireciona diretamente para o submenu Cargos (/cadastros-apoio/cargos),
 * conforme solicitado:
 * "O cadastro de cargos deve ser um submenu do cadastro de apoio, e o cadastro de apoio
 * deve ser o menu principal, pode retirar os outros cadastros de dentro dele".
 */
export default function CadastrosApoio() {
  return <Navigate to="/cadastros-apoio/cargos" replace />
}
