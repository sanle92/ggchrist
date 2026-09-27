import { BookOpenText } from 'lucide-react';

export function EmptyContent({ message }: { message: string }) {
  return <div className="ggc-card col-span-full grid min-h-80 place-items-center border-dashed p-10 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-full bg-amber/10 text-amber"><BookOpenText size={26} /></span><h2 className="mt-6 font-serif text-3xl text-forest">A new chapter is coming.</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink3">{message}</p></div></div>;
}
