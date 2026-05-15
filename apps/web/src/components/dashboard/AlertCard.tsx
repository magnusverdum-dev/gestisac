import { component$, type PropFunction } from '@builder.io/qwik';

type AlertCardProps = {
  alert: {
    title: string;
    detail: string;
    tone: string;
    icon: string;
  };
  onOpen$: PropFunction<() => void>;
};

export const AlertCard = component$((props: AlertCardProps) => {
  return (
    <button class={`alert-card ${props.alert.tone}`} type="button" onClick$={props.onOpen$}>
      <span class="alert-icon">{props.alert.icon}</span>
      <div>
        <strong>{props.alert.title}</strong>
        <small>{props.alert.detail}</small>
      </div>
      <span class="alert-arrow">-&gt;</span>
    </button>
  );
});
