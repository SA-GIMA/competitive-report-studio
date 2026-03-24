import type { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{props.title}</h2>
          {props.description ? <p>{props.description}</p> : null}
        </div>
        {props.action}
      </div>
      <div>{props.children}</div>
    </section>
  );
}
