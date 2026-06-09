from pathlib import Path

base = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'icons'

items = {
    'categories': [
        ('ic_competitive', '🏛️', '#667eea'),
        ('ic_entrance', '🎓', '#f093fb'),
        ('ic_school', '📚', '#4facfe'),
        ('ic_university', '🏫', '#43e97b'),
        ('ic_placement', '💼', '#fa709a'),
        ('ic_language', '🌐', '#a18cd1'),
        ('ic_olympiad', '🏅', '#ffecd2'),
        ('ic_abroad', '✈️', '#30cfd0'),
    ],
    'exams': [
        ('ic_upsc_cse', '🎯', '#7C3AED'), ('ic_nda', '⚔️', '#4C1D95'), ('ic_cds', '🎖️', '#5B21B6'), ('ic_ssc_cgl', '📊', '#047857'),
        ('ic_ssc_chsl', '📝', '#065F46'), ('ic_ssc_gd', '💪', '#10B981'), ('ic_police', '👮', '#1E40AF'), ('ic_sbi', '🦁', '#1D4ED8'),
        ('ic_rbi', '🏧', '#0369A1'), ('ic_rrb_ntpc', '🚆', '#D97706'), ('ic_railway', '🚂', '#B45309'), ('ic_metro', '🚇', '#0284C7'),
        ('ic_shield', '🛡️', '#374151'), ('ic_gear', '⚙️', '#4B5563'), ('ic_forest', '🌳', '#15803D'), ('ic_wrench', '🔧', '#92400E'),
        ('ic_bank', '🏦', '#1E40AF'), ('ic_nabard', '🌾', '#15803D'), ('ic_sebi', '📈', '#B45309'), ('ic_oil', '🛢️', '#92400E'),
        ('ic_power', '⚡', '#D97706'), ('ic_bhel', '🏭', '#374151'), ('ic_bel', '📡', '#0369A1'), ('ic_isro', '🚀', '#7C3AED'),
        ('ic_nuclear', '⚛️', '#DC2626'), ('ic_research', '🔬', '#1D4ED8'), ('ic_bio_research', '🧬', '#059669'), ('ic_coast_guard', '🌊', '#0284C7'),
        ('ic_itbp', '🏔️', '#374151'), ('ic_ib_acio', '🔍', '#1F2937'), ('ic_ssb', '🧠', '#7C3AED'), ('ic_judiciary', '⚖️', '#92400E'),
        ('ic_imd', '🌦️', '#0369A1'), ('ic_postal', '📮', '#DC2626'), ('ic_fci', '🍚', '#D97706'), ('ic_epfo', '💰', '#15803D'),
        ('ic_medical', '🏥', '#DC2626'),
    ],
    'entrance': [
        ('ic_neet', '🩺', '#059669'), ('ic_gpat', '💊', '#7C3AED'), ('ic_dental', '🦷', '#0369A1'), ('ic_ayush', '🌿', '#15803D'),
        ('ic_design', '🎨', '#BE185D'), ('ic_nift', '👗', '#9D174D'), ('ic_architecture', '🏗️', '#92400E'), ('ic_teacher', '👨‍🏫', '#065F46'),
        ('ic_hotel', '🏨', '#D97706'), ('ic_ftii', '🎬', '#7C3AED'), ('ic_journalism', '📺', '#0369A1'), ('ic_merchant_navy', '🚢', '#1E40AF'),
        ('ic_ca_final', '🏆', '#B45309'), ('ic_iit_jam', '📐', '#DC2626'), ('ic_gate', '🚪', '#0369A1'),
    ],
    'education': [
        ('ic_cbse', '📘', '#1D4ED8'), ('ic_icse', '📗', '#15803D'), ('ic_state_board', '📙', '#D97706'), ('ic_primary', '🌱', '#059669'),
        ('ic_middle', '📖', '#0369A1'), ('ic_senior_sec', '🎓', '#7C3AED'), ('ic_iit', '💻', '#DC2626'), ('ic_iim', '💼', '#1D4ED8'),
        ('ic_nlu', '⚖️', '#92400E'), ('ic_ignou', '📡', '#7C3AED'),
    ],
    'language': [
        ('ic_ielts', '🇬🇧', '#1D4ED8'), ('ic_toefl_gre', '🇺🇸', '#DC2626'), ('ic_pte', '🇦🇺', '#059669'), ('ic_german', '🇩🇪', '#1F2937'),
        ('ic_french', '🇫🇷', '#1D4ED8'), ('ic_jlpt', '🇯🇵', '#DC2626'), ('ic_topik', '🇰🇷', '#0369A1'), ('ic_hsk', '🇨🇳', '#DC2626'),
    ],
    'tabs': [
        ('ic_overview', '📌', '#6B7280'), ('ic_syllabus', '📋', '#3B82F6'), ('ic_mock_test', '🧪', '#F59E0B'), ('ic_answer_key', '🔑', '#EF4444'),
        ('ic_updates', '📰', '#06B6D4'), ('ic_strategy', '🎯', '#EC4899'), ('ic_interview', '🎤', '#F97316'),
    ],
    'badges': [
        ('ic_hot', '🔥', '#FF416C'), ('ic_new', '✨', '#11998e'), ('ic_premium', '💎', '#667eea'), ('ic_verified', '✅', '#43e97b'),
    ],
}

for folder, entries in items.items():
    out_dir = base / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, emoji, _ in entries:
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="{name}">
  <rect width="128" height="128" fill="transparent" />
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="56">{emoji}</text>
</svg>'''
        (out_dir / f'{name}.svg').write_text(svg, encoding='utf-8')

print(f'Generated {sum(len(v) for v in items.values())} SVG icons in {base}')
