'use client'

import { useState } from 'react'
import { Switch, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react'
import { User, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '../components/Header'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function ProfilePage() {
  const [enabled, setEnabled] = useState(true)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <section className="w-full h-full pt-8 px-4 lg:px-8 pb-24 flex flex-col gap-8">
      <Header title='Meu Perfil' subtitle=''/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24">
        {/* Sidebar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Seu nome</p>
            <p className="text-xs text-gray-500">seu@email.com</p>
          </div>
          <label className="cursor-pointer text-sm text-green-600 hover:underline">
            Alterar foto
            <input type="file" className="hidden"  />
          </label>
        </div>

        {/* Formulário de perfil */}
        <div className="lg:col-span-2">
          <TabGroup>
            <TabList className="flex space-x-2 border-b border-gray-200 mb-4">
              <Tab
                className={({ selected }) =>
                  classNames(
                    'px-4 py-2 text-sm font-medium rounded-t-md',
                    selected ? 'bg-white border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'
                  )
                }
              >
                Perfil
              </Tab>
              <Tab
                className={({ selected }) =>
                  classNames(
                    'px-4 py-2 text-sm font-medium rounded-t-md',
                    selected ? 'bg-white border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'
                  )
                }
              >
                Notificações
              </Tab>
            </TabList>
            <TabPanels className="bg-white border border-gray-200 rounded-b-xl shadow p-6 space-y-6">
              <TabPanel>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Nome" placeholder="Seu nome" />
                  <Input label="E-mail" placeholder="seu@email.com" type="email" />
                  <Input label="WhatsApp" placeholder="(00) 90000-0000" />
                  <div className="flex items-center justify-between col-span-full">
                    <span className="text-sm text-gray-700">Receber alertas por WhatsApp</span>
                    <Switch
                      checked={enabled}
                      onChange={setEnabled}
                      className={`${enabled ? 'bg-green-600' : 'bg-gray-300'}
                        relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span className="sr-only">Ativar alertas</span>
                      <span
                        className={`$ {
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                  </div>
                  <div className="col-span-full flex flex-wrap gap-2">
                    <Button type="submit">Salvar alterações</Button>
                    <Button variant="outline">Trocar senha</Button>
                    <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                      <Trash className="w-4 h-4 mr-1" /> Excluir conta
                    </Button>
                  </div>
                </form>
              </TabPanel>
              <TabPanel>
                <p className="text-sm text-gray-600">Em breve você poderá configurar notificações personalizadas.</p>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>

      <Transition show={isDeleteOpen} as={Dialog} onClose={setIsDeleteOpen}>
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 space-y-4">
            <DialogTitle className="text-lg font-semibold">Confirmar exclusão</DialogTitle>
            <p className="text-sm text-gray-600">Tem certeza que deseja excluir sua conta? Esta ação não poderá ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
              <Button variant="destructive">Confirmar exclusão</Button>
            </div>
          </DialogPanel>
        </div>
      </Transition>
    </section>
  )
}
