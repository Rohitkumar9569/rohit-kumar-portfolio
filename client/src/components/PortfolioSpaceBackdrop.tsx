const PortfolioSpaceBackdrop = () => {
  const shootingStars = ['one', 'two', 'three', 'four'];
  const sparkles = [
    { left: '8%', top: '18%', size: '0.34rem', opacity: 0.46 },
    { left: '18%', top: '62%', size: '0.24rem', opacity: 0.34 },
    { left: '28%', top: '30%', size: '0.28rem', opacity: 0.38 },
    { left: '44%', top: '17%', size: '0.22rem', opacity: 0.32 },
    { left: '58%', top: '48%', size: '0.36rem', opacity: 0.42 },
    { left: '72%', top: '22%', size: '0.26rem', opacity: 0.36 },
    { left: '84%', top: '56%', size: '0.32rem', opacity: 0.40 },
    { left: '92%', top: '34%', size: '0.22rem', opacity: 0.30 },
  ];

  return (
    <div className="portfolio-space-backdrop" aria-hidden="true">
      <span className="portfolio-space-nebula portfolio-space-nebula-one" />
      <span className="portfolio-space-nebula portfolio-space-nebula-two" />
      <span className="portfolio-space-galaxy-river" />
      <span className="portfolio-space-layer portfolio-space-layer-one" />
      <span className="portfolio-space-layer portfolio-space-layer-two" />
      <span className="portfolio-space-layer portfolio-space-layer-three" />
      <span className="portfolio-space-starfield portfolio-space-starfield-far" />
      <span className="portfolio-space-starfield portfolio-space-starfield-near" />
      {sparkles.map((star) => (
        <span
          key={`${star.left}-${star.top}`}
          className="portfolio-space-sparkle"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
      <span className="portfolio-space-aurora" />
      {shootingStars.map((star) => (
        <span key={star} className={`portfolio-shooting-star portfolio-shooting-star-${star}`} />
      ))}
      <span className="portfolio-space-water-stars" />
      <span className="portfolio-space-floor" />
      <span className="portfolio-space-orbit portfolio-space-orbit-one" />
      <span className="portfolio-space-orbit portfolio-space-orbit-two" />
      <span className="portfolio-space-glow portfolio-space-glow-one" />
      <span className="portfolio-space-glow portfolio-space-glow-two" />
      <span className="portfolio-space-vignette" />
    </div>
  );
};

export default PortfolioSpaceBackdrop;
