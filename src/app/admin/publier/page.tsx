import { PublishStudio } from '@/components/admin/publish-studio';

export const dynamic = 'force-dynamic';

export default function AdminPublishPage() {
  return (
    <div>
      <div className="mb-7 max-w-3xl">
        <h2 className="font-display text-2xl text-ivory-50">Publier un enseignement</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ivory-100/55">
          Quatre voies d’entrée, une seule arborescence : chaque contenu est rattaché à l’un des
          trois piliers puis rangé dans la sous-rubrique correspondante — automatiquement par l’IA,
          ou manuellement si vous imposez le classement.
        </p>
      </div>

      <PublishStudio />
    </div>
  );
}
