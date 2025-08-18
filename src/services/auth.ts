import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

export async function sendLoginCode(data: { email: string }) {
  const res = await axios.post(`${baseURL}/auth/send-code`, data)
  return res.data
}

export async function verifyCode(data: { email: string; code: string }) {
  const res = await axios.post(`${baseURL}/auth/verify-code`, data) 
  // ⚠️ Aqui você precisa extrair o token corretamente:

  const token = res.data.user.token
  
  if (token) {
    localStorage.setItem('token', token)
    // Se usar Zustand, setUser(res.data.user) também
  } else {
    console.error('Token não recebido no login!')
  }
  

  return res.data // token ou user
}
