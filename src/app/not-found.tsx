import { Compass } from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <PageContainer>
      <Card>
        <EmptyState
          icon={<Compass className="size-5" />}
          title="Pagina niet gevonden"
          description="Deze pagina bestaat niet."
          action={<ButtonLink href="/">Naar overzicht</ButtonLink>}
        />
      </Card>
    </PageContainer>
  );
}
