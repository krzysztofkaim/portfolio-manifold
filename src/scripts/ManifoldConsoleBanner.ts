const CUBE_COLORS = {
  accent: '#ff9748',
  accentSoft: '#ffbb74',
  accentStrong: '#ff003c',
  accentCool: '#00f3ff',
  text: '#f5f7ff',
  textWarm: '#fff1e7'
} as const;

let bannerLogged = false;

function buildConsoleBannerSvg(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700">
      <style>
        .wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 720px;
          background: transparent;
        }

        .cube {
          position: relative;
          width: 21rem;
          height: 21rem;
          transform-style: preserve-3d;
          transform: rotateY(18deg) rotateX(-26deg);
          animation: kaim_cube_spin 4.8s linear infinite;
        }

        .side {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          box-sizing: border-box;
          border: 3px solid ${CUBE_COLORS.accent};
          background: rgba(4, 4, 4, 0.78);
          color: ${CUBE_COLORS.text};
          font: 700 2.18rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
          text-transform: lowercase;
          text-shadow: 0 0 10px rgba(255, 151, 72, 0.2);
          backface-visibility: hidden;
        }

        .front {
          transform: translateZ(10.5rem);
          color: ${CUBE_COLORS.textWarm};
          border-color: ${CUBE_COLORS.accent};
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .back {
          transform: rotateY(180deg) translateZ(10.5rem);
          color: ${CUBE_COLORS.accentCool};
          border-color: ${CUBE_COLORS.accentCool};
        }

        .left {
          transform: rotateY(-90deg) translateZ(10.5rem);
          color: ${CUBE_COLORS.text};
          border-color: rgba(245, 247, 255, 0.82);
        }

        .right {
          transform: rotateY(90deg) translateZ(10.5rem);
          color: ${CUBE_COLORS.accentStrong};
          border-color: ${CUBE_COLORS.accentStrong};
        }

        .top {
          transform: rotateX(90deg) translateZ(10.5rem);
          color: ${CUBE_COLORS.accentSoft};
          border-color: ${CUBE_COLORS.accentSoft};
        }

        .bottom {
          transform: rotateX(-90deg) translateZ(10.5rem);
          color: ${CUBE_COLORS.textWarm};
          border-color: rgba(255, 177, 111, 0.92);
        }

        @keyframes kaim_cube_spin {
          0% {
            transform: rotateX(-26deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(-26deg) rotateY(360deg);
          }
        }
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" class="wrapper">
          <div class="cube" aria-label="kaim.dev">
            <div class="side front">kaim.dev</div>
            <div class="side back">kaim.dev</div>
            <div class="side left">kaim.dev</div>
            <div class="side right">kaim.dev</div>
            <div class="side top">kaim.dev</div>
            <div class="side bottom">kaim.dev</div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export function logManifoldConsoleBanner(): void {
  if (bannerLogged || typeof window === 'undefined') {
    return;
  }

  bannerLogged = true;

  const art = buildConsoleBannerSvg();
  const wrapperWidth = 'min(88vw, 1200px)';
  const wrapperHeight = 'min(88vh, 1200px)';
  const wrapperPaddingX = 'min(18vw, 320px)';
  const wrapperPaddingY = 'min(18vh, 320px)';
  const artStyle =
    `display:inline-block;width:${wrapperWidth};height:${wrapperHeight};line-height:1;` +
    'font-size:1px;color:transparent;box-sizing:content-box;' +
    `padding:${wrapperPaddingY} ${wrapperPaddingX};margin:0;background-color:transparent;background-repeat:no-repeat;` +
    'background-position:center center;background-size:contain;' +
    `background-image:url("${art}");`;

  console.info('%c ', artStyle);
}
