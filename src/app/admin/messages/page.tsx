import { ConsultationDesk } from '@/components/consultation-desk';

export const dynamic = 'force-dynamic';

export default function AdminMessagesPage() {
  return (
    <div>
      <div className="mb-7">
        <h2 className="font-display text-2xl text-ivory-50">Bureau de consultation</h2>
        <p className="mt-1.5 text-sm text-ivory-100/55">
          Les messages privés envoyés par les internautes depuis la plateforme.
        </p>
      </div>
      <ConsultationDesk admin />
    </div>
  );
}
