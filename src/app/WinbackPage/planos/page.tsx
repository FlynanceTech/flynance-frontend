"use client";

import { PageHeader } from "@/components/planos/PageHeader";
import { PlanCard, UiPlan } from "@/components/planos/plancard";
import PlansFaq from "@/components/planos/PlansFaq";
import { mapPlanToUi } from "@/components/planos/utils";
import { usePlans } from "@/hooks/query/usePlan";
import { useUserSession } from "@/stores/useUserSession";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeBillingSubscriptionPlan } from "@/services/billing";
import { billingKeys } from "@/hooks/query/useBilling";
import { readPersistedAuthToken } from "@/lib/authSession";
import { findCouplePlan } from "@/services/houses";
import { FEATURES } from "@/config/features";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function PlanosPage() {
  const t = useTranslations("winbackPlansPage");
  const { data, isLoading, isError } = usePlans();
  const { fetchAccount } = useUserSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<UiPlan | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    setHasToken(Boolean(readPersistedAuthToken()));
  }, []);

  const changePlanMutation = useMutation({
    mutationFn: async (planId: string) => changeBillingSubscriptionPlan({ planId }),
    onSuccess: async (response) => {
      const clientSecret = response.paymentClientSecret;

      if (clientSecret) {
        if (!stripePromise) {
          toast.error(t("changePlanModal.stripeNotReady"));
          return;
        }

        setIsConfirmingPayment(true);
        try {
          const stripe = await stripePromise;
          if (!stripe) {
            toast.error(t("changePlanModal.stripeNotReady"));
            return;
          }

          const confirmation = await stripe.confirmCardPayment(clientSecret);
          if (confirmation.error) {
            toast.error(
              confirmation.error.message || t("changePlanModal.confirmPaymentError")
            );
            return;
          }

          const status = confirmation.paymentIntent?.status;
          if (status && status !== "succeeded" && status !== "processing") {
            toast.error(t("changePlanModal.confirmPaymentError"));
            return;
          }
        } catch (error: unknown) {
          toast.error(
            error instanceof Error
              ? error.message
              : t("changePlanModal.confirmPaymentError")
          );
          return;
        } finally {
          setIsConfirmingPayment(false);
        }
      }

      await queryClient.invalidateQueries({
        queryKey: billingKeys.subscriptionSummaryRoot,
      });
      await fetchAccount();
      toast.success(t("changePlanModal.success"));
      setPendingPlan(null);
      router.push("/dashboard/perfil");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("changePlanModal.error"));
    },
  });

  const isProcessing = changePlanMutation.isPending || isConfirmingPayment;

  const handleSelectPlan = (plan: UiPlan) => {
    if (!hasToken) {
      router.push(`/cadastro/checkout?plano=${plan.slug}`);
      return;
    }
    setPendingPlan(plan);
  };

  const handleConfirmChange = () => {
    if (!pendingPlan) return;
    changePlanMutation.mutate(pendingPlan.id);
  };

  const uiPlans: UiPlan[] = (() => {
    if (!data) return [];
    const allowedSlugs = new Set(["essencial-mensal", "essencial-anual-lancamento"]);
    const basePlans = data.filter((plan) => allowedSlugs.has(plan.slug));
    if (!FEATURES.COUPLE_ACCOUNT) return basePlans.map(mapPlanToUi);
    const couplePlan = findCouplePlan(data);
    if (!couplePlan || basePlans.some((plan) => plan.id === couplePlan.id)) {
      return basePlans.map(mapPlanToUi);
    }
    return [...basePlans, couplePlan].map(mapPlanToUi);
  })();

  return (
    <div className="min-h-screen flex flex-col items-center ">
      <header className=" bg-gradient-to-r from-primary to-secondary w-full flex items-center justify-center ">
        <PageHeader title={t("headerTitle")} showBack />
      </header>
      <section className="flex flex-col gap-16 pb-16">
        {/* HERO */}
        <div className="text-center px-4 pt-8">
          <h1 className="text-4xl font-semibold text-primary">{t("heroTitle")}</h1>
        </div>

        {/* ESTADOS */}
        {isLoading && (
          <div className="flex justify-center items-center pb-20">
            <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-white/90 pb-20 text-center">{t("loadError")}</div>
        )}

        {/* PLANOS */}
        {!isLoading && !isError && (
          <div className="flex flex-col md:flex-row justify-center gap-10 px-6  w-full max-w-5xl">
            {uiPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                revalidateSubscription
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}
        <PlansFaq />
      </section>

      <Dialog
        open={Boolean(pendingPlan)}
        onOpenChange={(open) => {
          if (!open && !isProcessing) setPendingPlan(null);
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (isProcessing) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isProcessing) event.preventDefault();
          }}
        >
          {pendingPlan && (
            <>
              <DialogHeader>
                <DialogTitle>{t("changePlanModal.title")}</DialogTitle>
                <DialogDescription>
                  {t("changePlanModal.description", { planName: pendingPlan.title })}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {t("changePlanModal.nextBillingNote")}
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingPlan(null)}
                  disabled={isProcessing}
                >
                  {t("changePlanModal.cancel")}
                </Button>
                <Button onClick={handleConfirmChange} disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isConfirmingPayment
                        ? t("changePlanModal.confirmingPayment")
                        : t("changePlanModal.processing")}
                    </span>
                  ) : (
                    t("changePlanModal.confirm")
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
