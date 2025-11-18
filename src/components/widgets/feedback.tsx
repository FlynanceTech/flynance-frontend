'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Bug, Sparkles, MessageSquare, X } from 'lucide-react';
import { useUserSession } from '@/stores/useUserSession';

const schema = z.object({
  category: z.enum(['bug', 'melhoria', 'outros'], { required_error: 'Selecione uma categoria' }),
  subject: z.string().min(3, 'Informe um assunto (mín. 3 caracteres)').max(120, 'Máx. 120 caracteres'),
  message: z.string().min(10, 'Conte um pouco mais (mín. 10 caracteres)'),
});

export type FeedbackFormData = z.infer<typeof schema>;

type Props = {
  onSuccess?: () => void;
  className?: string;
};

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

// aceita `user`, `{ user }`, ou `null/undefined` e retorna `SessionUser | null`
function pickSessionUser(value: unknown): SessionUser | null {
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

  // caso 1: value é o próprio usuário
  if (isObj(value) && typeof value.id === 'string') {
    return {
      id: value.id,
      name: typeof value.name === 'string' ? value.name : null,
      email: typeof value.email === 'string' ? value.email : null,
    };
  }

  // caso 2: value possui nested `.user`
  if (isObj(value) && isObj(value.user) && typeof value.user.id === 'string') {
    return {
      id: value.user.id as string,
      name: typeof value.user.name === 'string' ? (value.user.name as string) : null,
      email: typeof value.user.email === 'string' ? (value.user.email as string) : null,
    };
  }

  return null;
}


export default function FeedbackWidget({  onSuccess, className }: Props) {
    const { user } = useUserSession()
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'ok' | 'err'>('idle');
  const [isOpen, setIsOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'melhoria', subject: '', message: '' },
  });

  const category = watch('category');

  const submit = async (data: FeedbackFormData) => {
    try {
      setSubmitting(true);
      setStatus('idle');

      const sessionUser = pickSessionUser(user);
      if (!sessionUser) {
        throw new Error('Sem usuário logado para enviar feedback.');
      }

      const payload = {
        ...data,
        user: sessionUser, // { id, name?, email? }
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Feedback error:', err);
        throw new Error('fail');
      }

      setStatus('ok');
      reset({ category: 'melhoria', subject: '', message: '' });
      onSuccess?.();
    } catch (e) {
      console.error(e);
      setStatus('err');
    } finally {
      setSubmitting(false);
    }
  };

  const hasUser = Boolean(pickSessionUser(user));

  const toggleWidget = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div>
        <button 
            onClick={toggleWidget}
            className='
                fixed lg:bottom-5 bottom-20
                left-4 right-auto lg:left-auto lg:right-4
                h-12 w-12 rounded-full shadow-lg z-50
                flex items-center justify-center
                bg-primary text-primary-foreground
                hover:bg-primary/90
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                transition'
        >   
            {isOpen ? <X className='h-5 w-5' /> :
        
            <MessageSquare className='h-5 w-5' />
            }
        </button>
        {
            isOpen && (
                    <>
                        {/* BACKDROP (clica fora => fecha) */}
                        <button
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                        onClick={() => setIsOpen(false)}
                        aria-label="Fechar feedback"
                        />

                        {/* PAINEL */}
                        <div
                        id="feedback-panel"
                        role="dialog"
                        aria-modal="true"
                        className={cn(
                            "fixed bottom-20 lg:right-5 left-5 right-4 lg:left-auto",
                            "w-auto max-w-xl shadow-sm z-50",
                            className
                        )}
                        onClick={(e) => e.stopPropagation()}
                        >
                            <div
                            className={cn(
                                'w-full max-w-[350px] rounded-2xl border bg-card p-4 sm:p-6 shadow-sm fixed bottom-36 lg:bottom-24 lg:right-5 z-50',
                                className
                            )}
                            >
                            <div className="mb-4">
                                <h3 className="text-base sm:text-lg font-semibold">Enviar feedback</h3>
                                <p className="text-sm text-muted-foreground">
                                Escolha uma categoria, descreva o assunto e conte os detalhes.
                                </p>
                            </div>

                            {/* categorias */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                                <RadioCard
                                selected={category === 'bug'}
                                icon={<Bug className="h-5 w-5" />}
                                label="Bug"
                                onClick={() => setValue('category', 'bug', { shouldValidate: true })}
                                />
                                <RadioCard
                                selected={category === 'melhoria'}
                                icon={<Sparkles className="h-5 w-5" />}
                                label="Melhoria"
                                onClick={() => setValue('category', 'melhoria', { shouldValidate: true })}
                                />
                                <RadioCard
                                selected={category === 'outros'}
                                icon={<MessageSquare className="h-5 w-5" />}
                                label="Outros"
                                onClick={() => setValue('category', 'outros', { shouldValidate: true })}
                                />
                            </div>
                            {errors.category && (
                                <p className="text-xs text-destructive -mt-2 mb-2">{errors.category.message}</p>
                            )}

                            {/* assunto */}
                            <div className="mb-3">
                                <Label htmlFor="subject">Assunto</Label>
                                <Input
                                id="subject"
                                placeholder="Resumo curto do feedback"
                                {...register('subject')}
                                className="mt-1"
                                />
                                {errors.subject && (
                                <p className="text-xs text-destructive mt-1">{errors.subject.message}</p>
                                )}
                            </div>

                            {/* mensagem */}
                            <div className="mb-4">
                                <Label htmlFor="message">Mensagem</Label>
                                <Textarea
                                id="message"
                                placeholder="Explique o que aconteceu ou a melhoria desejada…"
                                rows={5}
                                {...register('message')}
                                className="mt-1"
                                />
                                {errors.message && (
                                <p className="text-xs text-destructive mt-1">{errors.message.message}</p>
                                )}
                            </div>

                            {/* enviar */}
                            <div className="flex flex-col items-stretch sm:items-center gap-2">
                                
                                <Button
                                  onClick={handleSubmit(submit)}
                                  disabled={submitting || !hasUser}
                                  className="w-full"
                                >
                                  {submitting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Enviando…
                                    </>
                                  ) : (
                                    'Enviar feedback'
                                  )}
                                </Button>

                                <div className="text-sm">
                                {status === 'ok' && <span className="text-primary">Obrigado! Recebemos seu feedback. ✅</span>}
                                {status === 'err' && <span className="text-destructive">Não foi possível enviar. Tente novamente.</span>}
                                </div>
                            </div>
                            </div>
                    </div>
                </>
            )
        }
    </div>
  );
}

function RadioCard({
  selected,
  label,
  icon,
  onClick,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border p-3 sm:p-4 text-xs sm:text-sm transition',
        'hover:bg-accent hover:text-accent-foreground',
        selected
          ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
          : 'border-muted'
      )}
    >
      <div className={cn('mb-1', selected && 'text-primary')}>{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  );
}
