'use client'

import { useState } from 'react'
import { Bot, Send, X } from 'lucide-react'

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-38 lg:bottom-8 lg:right-8 right-4 z-50">
      {
        !open &&
        <button
            onClick={() => setOpen(!open)}
            className="bg-[#3ECC89] w-12 h-12  hover:bg-green-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
        >
            <Bot size={22} />
        </button>
      }

      {open && (
        <div className="w-80 h-96 bg-white border border-gray-200 shadow-xl rounded-lg mt-2 flex flex-col overflow-hidden">
            <header className='flex items-center justify-between bg-gradient-to-r from-[#3ECC89] to-[#1F6645] px-4 py-2 text-white'>
                <div className=" text-white text-sm font-semibold">
                    Fly sua assistente virtual
                </div>
                <button className='cursor-pointer' onClick={() => setOpen(!open)}>
                    <X size={20} />
                </button>
            </header>
          <div className="flex-1 p-4 overflow-y-auto text-sm text-gray-700 space-y-2">
            <div className="bg-gray-100 p-2 rounded-md">
              Olá! Sou a Fly Posso te ajudar a entender seus gastos. Pergunte algo como:
              <br /> <strong>“Quanto gastei esse mês?”</strong>
            </div>
            {/* Aqui você pode renderizar mensagens anteriores ou respostas do bot */}
          </div>
          <form className="border-t border-gray-200 p-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Digite sua pergunta..."
              className="flex-1 px-3 py-1 h-10 border border-gray-300 rounded-md text-sm outline-none"
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white h-10 px-3 py-2 rounded-md text-sm"
            >
              <Send  size={18}/>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
