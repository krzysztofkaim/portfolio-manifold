/**
 * StyleAdapter provides a bridge to the CSS Typed Object Model API for high-performance style updates.
 * This class handles the fallback between modern attributeStyleMap (Chromium-based browsers)
 * and standard string-based setProperty for others (Safari, Firefox).
 */

type TypedCssUnit = 'px' | 'deg' | 'percent';

interface CssTypedNumericFactory {
  deg(value: number): unknown;
  number(value: number): unknown;
  percent(value: number): unknown;
  px(value: number): unknown;
}

interface TypedStyleMapCapableElement extends HTMLElement {
  attributeStyleMap: {
    set(name: string, value: unknown): void;
  };
}

const cssTypedFactory = (window as Window & { CSS?: Partial<CssTypedNumericFactory> }).CSS;
const HAS_TYPED_OM =
  typeof cssTypedFactory !== 'undefined' &&
  typeof cssTypedFactory.number === 'function' &&
  'attributeStyleMap' in HTMLElement.prototype;

export class StyleAdapter {
  /**
   * Updates a numeric CSS custom property on an element.
   *
   * @param el The target HTML element
   * @param name The name of the CSS variable (e.g. '--my-var')
   * @param value Numerical value
   * @param unit Optional CSS unit (px, deg, percent)
   */
  static setNumericProperty(el: HTMLElement, name: string, value: number, unit?: TypedCssUnit): void {
    if (HAS_TYPED_OM) {
      try {
        (el as TypedStyleMapCapableElement).attributeStyleMap.set(name, this.createTypedValue(value, unit));
        return;
      } catch {
        // Fallback
      }
    }

    // High-performance quantization for Safari (no Typed OM)
    // Reducing string lengths significantly decreases JS-to-CSS bridge overhead.
    const isWebKit = !HAS_TYPED_OM;
    const precision = isWebKit ? 1 : 2;
    
    let valueStr: string;
    if (unit === 'px') valueStr = `${value.toFixed(precision)}px`;
    else if (unit === 'deg') valueStr = `${value.toFixed(precision)}deg`;
    else if (unit === 'percent') valueStr = `${(value * 100).toFixed(0)}%`;
    else valueStr = value.toFixed(precision + 1);

    el.style.setProperty(name, valueStr);
  }

  /**
   * Updates a string-based CSS property on an element.
   */
  static setProperty(el: HTMLElement, name: string, value: string): void {
     el.style.setProperty(name, value);
  }

  /**
   * Updates multiple numeric CSS custom properties on an element in a single pass.
   * On Safari/Firefox, this can be significantly faster than individual calls.
   */
  static setNumericProperties(el: HTMLElement, properties: Record<string, { value: number, unit?: TypedCssUnit }>): void {
    if (HAS_TYPED_OM) {
      const styleMap = (el as TypedStyleMapCapableElement).attributeStyleMap;
      for (const [name, { value, unit }] of Object.entries(properties)) {
        try {
          styleMap.set(name, this.createTypedValue(value, unit));
        } catch { /* Fallback handled by the loop if needed, but typed OM is usually robust here */ }
      }
      return;
    }

    const isWebKit = !HAS_TYPED_OM;
    const precision = isWebKit ? 1 : 2;
    
    for (const [name, { value, unit }] of Object.entries(properties)) {
      let valueStr: string;
      if (unit === 'px') valueStr = `${value.toFixed(precision)}px`;
      else if (unit === 'deg') valueStr = `${value.toFixed(precision)}deg`;
      else if (unit === 'percent') valueStr = `${(value * 100).toFixed(0)}%`;
      else valueStr = value.toFixed(precision + 1);

      el.style.setProperty(name, valueStr);
    }
  }

  private static createTypedValue(value: number, unit?: TypedCssUnit): unknown {
    if (!cssTypedFactory || typeof cssTypedFactory.number !== 'function') return value;
    if (!unit) return cssTypedFactory.number(value);
    if (unit === 'px' && typeof cssTypedFactory.px === 'function') return cssTypedFactory.px(value);
    if (unit === 'deg' && typeof cssTypedFactory.deg === 'function') return cssTypedFactory.deg(value);
    if (unit === 'percent' && typeof cssTypedFactory.percent === 'function') return cssTypedFactory.percent(value);
    return cssTypedFactory.number(value);
  }
}
