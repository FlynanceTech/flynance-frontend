'use client';

interface WaitlistEntry {
  name: string;
  email: string;
  phone: string
}

/**
 * Função para salvar um lead na lista de espera
 * @param data Dados do formulário { nome, email }
 * @returns { success: boolean, message: string }
 */
export async function saveWaitlistEntry(data: WaitlistEntry): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/inscrever', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar inscrição.');
    }

    const result = await response.json();
    return { success: true, message: result.message };
  } catch (error) {
    console.error('Erro no saveWaitlistEntry:', error);
    return { success: false, message: 'Falha ao realizar inscrição. Tente novamente.' };
  }
}
