import { forwardRef } from 'react';

const NIVEL_COR = {
  A: '#0B5CAB',
  B: '#2563EB',
  C: '#4F46E5',
  D: '#7C3AED',
  E: '#6B21A8',
};

function urlVerificar(badge, origin, urlBadgeBase) {
  // Badge atribuído (com token público) → página de verificação pública
  if (badge?.token_publico) return `${origin}/verificar/${badge.token_publico}`;
  // Badge do catálogo (sem token) → página de detalhe, se houver base definida
  if (urlBadgeBase && badge?.id_badge) return `${origin}${urlBadgeBase}/${badge.id_badge}`;
  return origin;
}

function BadgeAssinatura({ badge, origin, urlBadgeBase }) {
  const titulo = badge.titulo || badge.nome_badge || 'Badge';
  const nivel = badge.codigo_nivel || badge.nivel || '★';

  return (
    <a
      href={urlVerificar(badge, origin, urlBadgeBase)}
      target="_blank"
      rel="noreferrer"
      title={titulo}
      style={{
        display: 'inline-block',
        marginRight: '6px',
        marginBottom: '6px',
        textDecoration: 'none',
      }}
    >
      {badge.imagem_url ? (
        <img
          src={badge.imagem_url}
          alt={titulo}
          width="40"
          height="40"
          style={{
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            display: 'inline-block',
            objectFit: 'cover',
            verticalAlign: 'middle',
          }}
        />
      ) : (
        <span
          style={{
            backgroundColor: NIVEL_COR[nivel] || '#0B5CAB',
            borderRadius: '50%',
            color: '#ffffff',
            display: 'inline-block',
            fontSize: '15px',
            fontWeight: 'bold',
            height: '40px',
            lineHeight: '40px',
            textAlign: 'center',
            verticalAlign: 'middle',
            width: '40px',
          }}
        >
          {nivel}
        </span>
      )}
    </a>
  );
}

const AssinaturaEmailPreview = forwardRef(function AssinaturaEmailPreview({
  nome,
  cargo,
  email,
  badges = [],
  rotuloBadges = 'Badges verificados',
  urlBadgeBase = null,
  origin = window.location.origin,
}, ref) {
  const nomeFinal = nome?.trim() || 'Nome';
  const cargoFinal = cargo?.trim() || 'Softinsa';
  const emailFinal = email?.trim();
  const badgesVisiveis = badges.slice(0, 6);

  return (
    <div ref={ref} style={{ maxWidth: '620px', width: '100%' }}>
      <table
        cellPadding="0"
        cellSpacing="0"
        role="presentation"
        style={{
          color: '#1e293b',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '620px',
          width: '100%',
        }}
      >
        <tbody>
          <tr>
            <td style={{ backgroundColor: '#0B5CAB', borderRadius: '4px', width: '4px' }} />
            <td style={{ padding: '0 16px', verticalAlign: 'top' }}>
              <div style={{ color: '#0B5CAB', fontSize: '16px', fontWeight: 'bold', lineHeight: '20px' }}>
                {nomeFinal}
              </div>
              <div style={{ color: '#475569', fontSize: '13px', lineHeight: '18px', marginTop: '2px' }}>
                {cargoFinal}
              </div>
              {emailFinal && (
                <div style={{ color: '#64748b', fontSize: '12px', lineHeight: '18px', marginTop: '4px' }}>
                  {emailFinal}
                </div>
              )}
              <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '16px', marginTop: '2px' }}>
                SOFTINSA
              </div>
            </td>
            {badgesVisiveis.length > 0 && (
              <td style={{ paddingLeft: '4px', verticalAlign: 'top', width: '180px' }}>
                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                  {rotuloBadges}
                </div>
                <div>
                  {badgesVisiveis.map((badge) => (
                    <BadgeAssinatura
                      key={badge.id_badge_atribuido || badge.id_badge || badge.token_publico || badge.titulo}
                      badge={badge}
                      origin={origin}
                      urlBadgeBase={urlBadgeBase}
                    />
                  ))}
                </div>
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
});

export default AssinaturaEmailPreview;
