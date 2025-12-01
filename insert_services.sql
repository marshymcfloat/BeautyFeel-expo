-- Insert Services for The Beauty Lounge
-- Execute this SQL in Supabase SQL Editor

-- ============================================
-- NAIL CARE SERVICES (NAILS branch)
-- ============================================

INSERT INTO service (branch, title, description, price, duration_minutes, category, is_active) VALUES
('NAILS', 'Manicure Gel', 
'Transform your hands with our premium gel manicure service. Our expert technicians use high-quality gel polish that provides a flawless, chip-resistant finish lasting up to 3 weeks. Includes nail shaping, cuticle care, hand massage, and your choice of color. Perfect for special occasions or everyday elegance. Experience the luxury of long-lasting, salon-quality nails that stay beautiful day after day.',
280, 75, 'Nail Care', true),

('NAILS', 'Pedicure Gel', 
'Pamper your feet with our luxurious gel pedicure treatment. This comprehensive service includes foot soak, exfoliation, nail shaping, cuticle care, relaxing foot and leg massage, and beautiful gel polish application. Perfect for sandal season or anytime you want to feel confident and polished. Our gel polish ensures your pedicure stays flawless for weeks, making it an excellent value for your beauty investment.',
300, 90, 'Nail Care', true),

('NAILS', 'Foot Spa', 
'Indulge in ultimate relaxation with our rejuvenating foot spa experience. This therapeutic treatment includes a warm aromatic foot soak, gentle exfoliation to remove dead skin, nail trimming and shaping, cuticle care, and a soothing foot and leg massage. Perfect for tired, overworked feet. Leave feeling refreshed, renewed, and ready to take on the world. Ideal for self-care days or as a gift to someone special.',
250, 60, 'Nail Care', true),

('NAILS', 'Foot Spa with Regular Gel', 
'Combine the best of both worlds with our foot spa treatment enhanced with regular gel polish application. Enjoy all the benefits of our luxurious foot spa - warm soak, exfoliation, nail care, and massage - plus a beautiful gel polish finish that lasts. This comprehensive package gives you relaxation and long-lasting beauty in one perfect treatment. The ultimate indulgence for your feet.',
430, 90, 'Nail Care', true),

('NAILS', 'Soft Gel Nail Extensions', 
'Achieve the length and shape you''ve always dreamed of with our premium soft gel nail extensions. Our skilled technicians create natural-looking extensions using high-quality soft gel that''s flexible, durable, and comfortable. Perfect for those who want longer nails or need to repair damaged nails. Includes full nail art design, shaping, and gel polish application. Transform your look with beautiful, strong extensions that feel completely natural.',
699, 120, 'Nail Extensions', true),

('NAILS', 'Regular Manicure', 
'Classic nail care at its finest. Our regular manicure includes nail shaping, cuticle care, hand massage, and your choice of regular polish color. Perfect for those who prefer traditional polish or want a quick refresh. This timeless service keeps your hands looking neat, polished, and professional. An affordable way to maintain beautiful, well-groomed nails.',
150, 45, 'Nail Care', true);

-- ============================================
-- EYELASH/EYEBROW SERVICES (LASHES branch)
-- ============================================

INSERT INTO service (branch, title, description, price, duration_minutes, category, is_active) VALUES
('LASHES', 'Classic Eyelash Extensions', 
'Enhance your natural beauty with our classic eyelash extensions. Each individual lash is carefully applied to your natural lashes, creating a fuller, longer, and more defined look. Wake up every morning with perfect lashes - no mascara needed! Our premium synthetic lashes are lightweight, comfortable, and designed to last 3-4 weeks with proper care. Perfect for everyday glamour or special occasions. Experience the confidence that comes with beautiful, fluttery lashes.',
399, 120, 'Eyelash Extensions', true),

('LASHES', 'Wispy Eyelash Extensions', 
'Get that coveted wispy, natural look with our signature wispy eyelash extensions. This technique creates a soft, feathery appearance with varying lengths that mimic natural lashes. Perfect for those who want enhanced beauty without looking overdone. The wispy style adds volume and length while maintaining a natural, effortless elegance. Wake up looking refreshed and beautiful every single day.',
450, 120, 'Eyelash Extensions', true),

('LASHES', 'Doll Eye Eyelash Extensions', 
'Achieve wide-eyed, doll-like beauty with our doll eye eyelash extensions. This style features longer lashes in the center of the eye, creating an open, youthful appearance that makes your eyes pop. Perfect for those with smaller eyes or anyone wanting a more dramatic, eye-opening effect. The doll eye technique enhances your natural eye shape while adding glamour and sophistication. Look and feel like a living doll.',
450, 120, 'Eyelash Extensions', true),

('LASHES', 'Cat Eye Eyelash Extensions', 
'Channel your inner feline with our stunning cat eye eyelash extensions. This classic style features longer lashes at the outer corners, creating a sultry, lifted effect that''s both elegant and seductive. Perfect for almond-shaped eyes or anyone wanting a dramatic, glamorous look. The cat eye technique elongates your eyes and adds instant sophistication. Get ready to turn heads with your mesmerizing gaze.',
450, 120, 'Eyelash Extensions', true),

('LASHES', 'Volume Eyelash Extensions', 
'Experience maximum drama with our volume eyelash extensions. Using multiple fine lashes per natural lash, we create incredible fullness and density that''s both luxurious and eye-catching. Perfect for special events, photoshoots, or anyone who loves bold, glamorous lashes. Our volume technique provides 2-6 lashes per natural lash, creating a stunning, full look that''s still lightweight and comfortable. Prepare to be amazed by your transformation.',
500, 150, 'Eyelash Extensions', true),

('LASHES', 'Eyelash Perming', 
'Get naturally curled lashes that last for weeks with our professional eyelash perming service. This treatment curls your natural lashes from root to tip, creating a beautiful upward curl that opens up your eyes. No more struggling with eyelash curlers! Perfect for those with straight or downward-pointing lashes. The results last 6-8 weeks, giving you long-lasting, effortless beauty. Wake up with perfectly curled lashes every morning.',
399, 60, 'Eyelash Treatment', true),

('LASHES', 'Eyelash Perm with Tint', 
'Combine the benefits of eyelash perming with professional tinting for the ultimate lash enhancement. Get beautifully curled lashes plus rich, dark color that makes your lashes appear thicker and more defined. This two-in-one treatment saves you time and money while delivering stunning results. Perfect for those with light-colored lashes or anyone wanting maximum impact. No mascara needed for weeks!',
450, 75, 'Eyelash Treatment', true),

('LASHES', 'Eyebrow Lamination', 
'Achieve perfectly groomed, Instagram-worthy eyebrows with our eyebrow lamination service. This revolutionary treatment straightens and sets your brow hairs in place, creating a smooth, uniform appearance that lasts 6-8 weeks. Perfect for unruly, coarse, or downward-growing brows. The treatment includes shaping, tinting, and styling to give you the brows of your dreams. Say goodbye to daily brow maintenance and hello to flawless, low-maintenance beauty.',
450, 60, 'Eyebrow Treatment', true);

-- ============================================
-- WAXING/BODY SERVICES (MASSAGE branch)
-- ============================================

INSERT INTO service (branch, title, description, price, duration_minutes, category, is_active) VALUES
('MASSAGE', 'Underarm Wax', 
'Say goodbye to daily shaving with our professional underarm waxing service. Our expert technicians use high-quality wax and techniques to ensure minimal discomfort and maximum smoothness. Results last 3-4 weeks, and with regular treatments, hair grows back finer and sparser. Experience the freedom of smooth, hair-free underarms without the hassle of daily maintenance. Perfect for busy individuals who want long-lasting results.',
350, 20, 'Waxing', true),

('MASSAGE', 'Whole Arm Wax', 
'Achieve silky-smooth arms from shoulder to wrist with our comprehensive whole arm waxing treatment. This service removes unwanted hair from both arms, leaving you with smooth, touchable skin that lasts for weeks. Our gentle waxing techniques minimize discomfort while delivering exceptional results. Perfect for special occasions, beach season, or everyday confidence. Regular treatments lead to finer, slower-growing hair over time.',
350, 30, 'Waxing', true),

('MASSAGE', 'Half Legs Wax', 
'Get smooth, hair-free legs from knee to ankle with our half leg waxing service. Perfect for those who want to maintain beautiful legs without the commitment of a full leg treatment. Our professional waxing ensures long-lasting smoothness and reduces hair growth over time. Ideal for regular maintenance or special occasions. Experience the confidence that comes with perfectly smooth legs.',
350, 40, 'Waxing', true),

('MASSAGE', 'Whole Legs Wax', 
'Experience the ultimate in leg smoothness with our complete whole leg waxing treatment. From thighs to toes, we remove all unwanted hair, leaving you with silky-smooth, touchable skin that lasts 4-6 weeks. Our expert technicians use premium wax and techniques to minimize discomfort while maximizing results. Regular treatments result in finer, sparser hair growth. Perfect for beach season, special events, or everyday confidence.',
450, 60, 'Waxing', true),

('MASSAGE', 'Brazilian Wax', 
'Experience our most popular intimate waxing service - the Brazilian wax. Our highly trained, professional technicians ensure your comfort and privacy while delivering exceptional results. This complete hair removal service leaves you smooth and confident. We use premium wax and techniques designed to minimize discomfort. Results last 3-4 weeks, and regular treatments lead to finer, slower-growing hair. Book with confidence knowing you''re in expert hands.',
800, 45, 'Waxing', true),

('MASSAGE', 'Whole Body Scrub', 
'Reveal your most radiant, glowing skin with our luxurious whole body scrub treatment. This exfoliating service removes dead skin cells, unclogs pores, and stimulates circulation, leaving your entire body silky smooth and rejuvenated. Our premium scrubs are infused with nourishing ingredients that hydrate and soften your skin. Perfect for pre-event preparation, post-vacation refresh, or regular self-care. Experience the transformation of your skin texture and tone.',
750, 75, 'Body Treatment', true);

-- ============================================
-- SKIN CARE TREATMENT SERVICES (SKIN branch)
-- ============================================

INSERT INTO service (branch, title, description, price, duration_minutes, category, is_active) VALUES
('SKIN', 'Deep Cleaning Facial', 
'Purify and rejuvenate your skin with our intensive deep cleaning facial, exclusively performed by our certified aesthetic nurse. This comprehensive treatment includes thorough cleansing, gentle exfoliation, extractions, and deep pore cleansing to remove impurities, blackheads, and whiteheads. Our professional-grade products and techniques leave your skin clean, clear, and refreshed. Perfect for congested skin or regular maintenance. Experience the difference of professional-grade skincare.',
800, 75, 'Facial Treatment', true),

('SKIN', 'Lightening Facial', 
'Achieve a brighter, more even complexion with our advanced lightening facial treatment, performed by our certified aesthetic nurse. This specialized facial targets hyperpigmentation, dark spots, and uneven skin tone using professional-grade lightening agents and brightening techniques. Experience visible results as your skin becomes more radiant and uniform. Perfect for those dealing with sun damage, age spots, or post-acne marks. Reveal your naturally glowing, luminous skin.',
1200, 90, 'Facial Treatment', true),

('SKIN', 'Hydraderma Facial', 
'Quench your skin''s thirst with our revolutionary Hydraderma facial, exclusively performed by our certified aesthetic nurse. This intensive hydration treatment deeply moisturizes and plumps your skin, reducing fine lines and restoring youthful elasticity. Using advanced hyaluronic acid technology and hydrating serums, this facial delivers immediate and long-lasting results. Perfect for dry, dehydrated, or mature skin. Experience the ultimate hydration boost for visibly younger-looking skin.',
1500, 90, 'Facial Treatment', true),

('SKIN', 'Wart Treatment (Minimum)', 
'Safely and effectively remove unwanted warts with our professional wart treatment, performed by our certified aesthetic nurse. Using advanced techniques and medical-grade equipment, we ensure safe removal with minimal discomfort and scarring. Treatment is customized to your specific needs. The minimum price covers standard wart removal; larger or multiple warts may require additional sessions. Restore smooth, clear skin with professional care you can trust.',
800, 45, 'Medical Treatment', true),

('SKIN', 'Acne Facial', 
'Combat acne and achieve clearer skin with our specialized acne facial treatment, exclusively performed by our certified aesthetic nurse. This targeted treatment includes deep cleansing, gentle extractions, anti-inflammatory masks, and professional-grade acne-fighting products. Designed to reduce active breakouts, prevent future ones, and minimize scarring. Perfect for those struggling with persistent acne or occasional breakouts. Take control of your skin health with professional-grade treatment.',
999, 75, 'Facial Treatment', true),

('SKIN', 'BB Glow with Cheek Blush', 
'Achieve a natural, radiant glow with our BB Glow treatment enhanced with cheek blush, performed by our certified aesthetic nurse. This innovative semi-permanent makeup technique creates a flawless, even-toned complexion that lasts for months. The BB Glow foundation evens out skin tone while the cheek blush adds a natural flush of color. Wake up every day with perfect, glowing skin - no foundation needed! Perfect for busy individuals who want effortless beauty.',
2300, 90, 'Semi-Permanent Makeup', true),

('SKIN', 'Carbon Laser Deluxe', 
'Experience advanced skin rejuvenation with our Carbon Laser Deluxe treatment, performed by our certified aesthetic nurse. This cutting-edge laser therapy uses carbon particles and laser technology to deeply cleanse pores, reduce oil production, minimize pores, and improve skin texture. Perfect for oily, acne-prone, or congested skin. The treatment also stimulates collagen production for firmer, more youthful-looking skin. Experience the power of professional laser skincare.',
1900, 60, 'Laser Treatment', true),

('SKIN', 'CO2 Fractional Laser', 
'Transform your skin with our premium CO2 Fractional Laser treatment, performed by our certified aesthetic nurse. This advanced resurfacing treatment addresses fine lines, wrinkles, acne scars, sun damage, and uneven skin texture. The fractional laser creates micro-injuries that stimulate your body''s natural healing process, resulting in smoother, tighter, more youthful skin. Results improve over several weeks as new collagen forms. Invest in your skin''s future with this gold-standard treatment.',
5000, 90, 'Laser Treatment', true),

('SKIN', 'Microneedling', 
'Stimulate your skin''s natural collagen production with our professional microneedling treatment, performed by our certified aesthetic nurse. This minimally invasive procedure uses fine needles to create controlled micro-injuries, triggering your body''s healing response. Results include reduced fine lines, improved skin texture, minimized pores, and faded scars. Perfect for anti-aging, acne scars, or overall skin rejuvenation. Experience smoother, firmer, more radiant skin with this proven treatment.',
3500, 75, 'Skin Rejuvenation', true),

('SKIN', 'IPL (Hair Growth Treatment)', 
'Reduce unwanted hair growth with our Intense Pulsed Light (IPL) treatment, performed by our certified aesthetic nurse. This advanced light therapy targets hair follicles to reduce and eventually eliminate hair growth in treated areas. Safe, effective, and suitable for most skin types. Multiple sessions provide long-lasting results, reducing the need for constant shaving or waxing. Invest in long-term hair reduction and enjoy smoother skin with minimal maintenance.',
500, 30, 'Hair Removal', true),

('SKIN', 'Exilift (Price Starts At)', 
'Experience non-surgical skin tightening with our Exilift treatment, performed by our certified aesthetic nurse. This innovative radiofrequency technology lifts and tightens sagging skin, reduces fine lines, and improves overall skin elasticity. Perfect for addressing loose skin on the face, neck, or body. The treatment is comfortable with no downtime. Results improve over time as collagen production increases. Starting price covers standard treatment areas; larger areas may require additional sessions. Rejuvenate your appearance without surgery.',
899, 60, 'Skin Tightening', true),

('SKIN', 'Glutathione Drip and Push (Price Starts At)', 
'Boost your skin''s natural radiance and overall health with our Glutathione IV therapy, performed by our certified aesthetic nurse. Glutathione is a powerful antioxidant that brightens skin, reduces hyperpigmentation, and supports overall wellness. The IV drip ensures maximum absorption for optimal results. Starting price covers standard dosage; higher concentrations or combination therapies available. Experience brighter, more even-toned skin while supporting your body''s natural detoxification processes. Perfect for those seeking both beauty and wellness benefits.',
800, 45, 'IV Therapy', true);

-- Note: Mesolipo (Fat Shrinker) and Skin Booster are marked as "Soon..." 
-- and are not included as they are not yet available/priced.

-- ============================================
-- MASSAGE THERAPY SERVICES (MASSAGE branch)
-- ============================================

INSERT INTO service (branch, title, description, price, duration_minutes, category, is_active) VALUES
('MASSAGE', '60mins Swedish Massage', 
'Relax and unwind with our classic Swedish massage. This gentle, flowing technique uses long strokes, kneading, and circular movements to release muscle tension, improve circulation, and promote deep relaxation. Perfect for stress relief, muscle soreness, or simply treating yourself to some well-deserved pampering. Our skilled therapists customize the pressure to your preference, ensuring a comfortable and therapeutic experience. Leave feeling refreshed, rejuvenated, and completely relaxed.',
500, 60, 'Massage Therapy', true),

('MASSAGE', '60mins Combination Massage', 
'Experience the best of multiple massage techniques in one session. Our combination massage blends Swedish, deep tissue, and other therapeutic techniques tailored to your specific needs. Perfect for addressing multiple areas of tension or those who want a varied, comprehensive treatment. Our expert therapists adapt their approach throughout the session to target your problem areas effectively. Experience ultimate relaxation and relief in one perfect treatment.',
600, 60, 'Massage Therapy', true),

('MASSAGE', '60mins Thai Massage', 
'Experience the ancient art of Thai massage, combining acupressure, assisted yoga stretches, and energy work. Performed on a mat on the floor while you remain fully clothed, this unique therapy improves flexibility, releases deep tension, and balances your body''s energy. Our trained therapists use their hands, elbows, knees, and feet to apply pressure and guide you through stretches. Perfect for those seeking a more active, invigorating massage experience. Feel energized, flexible, and balanced.',
700, 60, 'Massage Therapy', true),

('MASSAGE', '60mins Shiatsu Massage', 
'Discover the healing power of Shiatsu, a Japanese massage technique based on traditional Chinese medicine. Using finger and palm pressure on specific points along energy meridians, our skilled therapists balance your body''s energy flow, relieve tension, and promote healing. This deeply relaxing yet invigorating treatment addresses both physical and energetic imbalances. Perfect for stress relief, pain management, or overall wellness. Experience the harmony of body and mind.',
700, 60, 'Massage Therapy', true),

('MASSAGE', '90 mins Traditional Massage', 
'Indulge in an extended traditional massage session for complete relaxation and thorough tension relief. This 90-minute treatment allows our therapists to work more deeply on problem areas and provide comprehensive full-body care. Using traditional techniques, we address muscle tension, improve circulation, and promote deep relaxation. Perfect for those who need extra time to fully unwind or have multiple areas requiring attention. Experience the luxury of extended therapeutic care.',
800, 90, 'Massage Therapy', true),

('MASSAGE', '90 mins Hot Stone Massage', 
'Experience ultimate relaxation with our luxurious hot stone massage. Smooth, heated stones are placed on key points of your body and used by our therapists to deliver deep, penetrating heat therapy. The combination of heat and massage releases chronic tension, improves circulation, and promotes profound relaxation. Perfect for those with muscle stiffness, stress, or anyone seeking a truly indulgent spa experience. Feel your worries melt away as the warmth soothes your body and soul.',
999, 90, 'Massage Therapy', true),

('MASSAGE', '90mins Ventossa Massage', 
'Experience the ancient healing technique of Ventossa (cupping) combined with therapeutic massage. Our therapists use special cups to create suction on your skin, promoting blood flow, releasing muscle tension, and facilitating healing. Combined with traditional massage techniques, this treatment addresses deep-seated pain, improves circulation, and promotes overall wellness. Perfect for those with chronic pain, muscle tension, or seeking alternative healing methods. Experience the unique benefits of this time-tested therapy.',
999, 90, 'Massage Therapy', true),

('MASSAGE', 'Prenatal Massage (DOH lic. Therapist only)', 
'Safely pamper yourself during pregnancy with our specialized prenatal massage, performed exclusively by DOH-licensed therapists trained in prenatal care. This gentle, side-lying massage addresses the unique discomforts of pregnancy, including back pain, swollen feet, and muscle tension. Our therapists use specialized techniques and positioning to ensure your comfort and safety. Perfect for expectant mothers seeking relief and relaxation. Nurture yourself and your baby with professional, safe care.',
500, 75, 'Specialized Massage', true),

('MASSAGE', 'Pediatric Massage', 
'Provide gentle, therapeutic care for your child with our pediatric massage service, performed by trained therapists experienced in working with children. This gentle massage helps with relaxation, improves sleep, aids digestion, and provides comfort for growing bodies. Perfect for children dealing with stress, growing pains, or simply needing some soothing touch. Our therapists create a safe, comfortable environment tailored to your child''s needs. Give your child the gift of relaxation and wellness.',
500, 45, 'Specialized Massage', true),

('MASSAGE', '30mins Back Massage', 
'Target your back tension with our focused 30-minute back massage. Perfect for quick relief from work-related stress, muscle stiffness, or chronic back pain. Our therapists concentrate on your back, shoulders, and neck, using techniques to release tension and improve mobility. Ideal for those with limited time who need targeted relief. Quick, effective, and affordable - the perfect solution for busy schedules.',
300, 30, 'Targeted Massage', true),

('MASSAGE', '45mins Back and Head Massage', 
'Relieve tension from head to shoulders with our comprehensive back and head massage. This extended treatment addresses back tension while also releasing stress held in your scalp, temples, and neck. Perfect for those who suffer from headaches, neck pain, or overall upper body tension. Our therapists use specialized techniques to release tension in both areas, leaving you feeling relaxed and refreshed. Experience complete upper body relief in one focused session.',
400, 45, 'Targeted Massage', true),

('MASSAGE', '30mins Foot Reflex and Leg Massage', 
'Revive tired feet and legs with our focused reflexology and leg massage. This 30-minute treatment combines foot reflexology - applying pressure to specific points on your feet that correspond to different body systems - with leg massage to improve circulation and relieve tension. Perfect for those who spend long hours on their feet or experience leg fatigue. Experience the dual benefits of reflexology and massage in one efficient treatment.',
300, 30, 'Reflexology', true),

('MASSAGE', '45mins Foot Reflex and Leg Massage', 
'Indulge in extended foot and leg care with our comprehensive 45-minute reflexology and leg massage. This longer session allows for deeper work on your feet''s reflex points and more thorough leg massage. Perfect for addressing chronic foot pain, poor circulation, or simply treating yourself to extended relaxation. Our therapists provide detailed attention to both reflexology points and leg muscles, ensuring complete relief and rejuvenation. Give your lower body the care it deserves.',
400, 45, 'Reflexology', true);

-- ============================================
-- Verification Query (Optional - run to see inserted services)
-- ============================================
-- SELECT branch, title, price, duration_minutes, category 
-- FROM service 
-- ORDER BY branch, category, title;
