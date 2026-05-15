import { component$ } from '@builder.io/qwik';

export const VisualAnchor = component$((props: { visual: string }) => {
  if (props.visual === 'building') {
    return (
      <div class="visual-anchor building-visual" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (props.visual === 'wallet') {
    return (
      <div class="visual-anchor wallet-visual" aria-hidden="true">
        <span />
        <strong>€</strong>
      </div>
    );
  }

  if (props.visual === 'tools') {
    return (
      <div class="visual-anchor tools-visual" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div class="visual-anchor chart-visual" aria-hidden="true">
      <span />
      <span />
      <span />
      <strong />
    </div>
  );
});
