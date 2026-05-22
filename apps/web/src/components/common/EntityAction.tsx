import { component$, Slot, type PropFunction } from '@builder.io/qwik';

export type EntityActionProps = {
  path: string;
  navigate$: PropFunction<(path: string) => void>;
  ariaLabel?: string;
  title?: string;
  class?: string;
  disabled?: boolean;
};

export const EntityAction = component$((props: EntityActionProps) => (
  <button
    type="button"
    class={props.class ?? 'entity-action'}
    aria-label={props.ariaLabel}
    title={props.title}
    disabled={props.disabled || !props.path}
    onClick$={async () => {
      if (props.path) {
        await props.navigate$(props.path);
      }
    }}
  >
    <Slot />
  </button>
));
