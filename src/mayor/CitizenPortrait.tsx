import { getCitizenAppearance, citizenEmotionLabels, type CitizenEmotion } from './citizenIdentity';
import './citizen-portraits.css';

/** Small, reusable pixel portraits; the face remains recognizable in every emotion. */
export default function CitizenPortrait({ identity, name, emotion = 'neutral', size = 48, decorative = false }: {
  identity: string;
  name: string;
  emotion?: CitizenEmotion;
  size?: number;
  decorative?: boolean;
}) {
  const person = getCitizenAppearance(identity);
  const { skin, shadow, hair, shirt, accent, background, hairStyle, accessory } = person;
  const ink = '#39444c';
  const happy = emotion === 'happy' || emotion === 'grateful';
  const angry = emotion === 'angry';
  const concerned = emotion === 'concerned';
  return (
    <svg className={`citizen-portrait is-${emotion}`} width={size} height={size} viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `${name} — ${citizenEmotionLabels[emotion]}`}
      aria-hidden={decorative || undefined} focusable="false" shapeRendering="crispEdges">
      <path d="M8 0H56V4H60V8H64V56H60V60H56V64H8V60H4V56H0V8H4V4H8Z" fill={background} />
      <path d="M8 48H16V44H48V48H56V56H60V64H4V56H8Z" fill={shirt} />
      {accessory === 'vest' && <path d="M12 46H22V64H10V52H12ZM42 46H52V52H54V64H42Z" fill={accent} />}
      {hairStyle === 'bob' && <path d="M14 20H50V48H44V52H20V48H14Z" fill={hair} />}
      {hairStyle === 'headscarf' && <path d="M22 8H42V12H48V20H52V46H48V52H16V46H12V20H16V12H22Z" fill={accent} />}
      <path d="M26 38H38V47H42V50H22V47H26Z" fill={shadow} />
      <path d="M26 43H38V48H26Z" fill={skin} />
      <path d="M20 15H44V19H48V33H44V41H40V45H24V41H20V33H16V21H20Z" fill={skin} />
      <path d="M42 22H46V34H42V40H38V43H40V41H44V33H48V23H46V20H42Z" fill={shadow} />
      <path d="M15 26H19V33H15ZM45 26H49V32H45Z" fill={skin} />
      {hairStyle === 'bun' && <><path d="M24 4H36V6H40V14H36V18H24V14H20V8H24Z" fill={hair} /><path d="M20 12H44V16H48V24H42V20H26V22H20V28H16V18H20Z" fill={hair} /></>}
      {hairStyle === 'curls' && <path d="M20 10H28V8H36V10H44V14H48V24H42V20H38V22H32V18H28V22H22V26H16V18H14V14H20Z" fill={hair} />}
      {hairStyle === 'short' && <path d="M20 10H40V12H46V16H48V23H42V18H34V22H22V26H17V18H20Z" fill={hair} />}
      {hairStyle === 'sidepart' && <path d="M20 11H42V14H48V24H42V18H36V20H28V24H18V29H15V18H20Z" fill={hair} />}
      {hairStyle === 'bob' && <path d="M20 11H40V14H46V22H42V18H36V22H24V26H18V37H14V20H18V15H20Z" fill={hair} />}
      {hairStyle === 'headscarf' && <><path d="M22 12H42V16H46V28H42V20H24V24H20V34H16V20H22Z" fill={accent} /><path d="M20 40H24V46H40V42H44V49H39V54H27V51H20Z" fill={accent} /></>}
      {hairStyle === 'cap' && <><path d="M18 14H46V30H42V20H22V30H18Z" fill={hair} /><path d="M20 9H40V12H46V20H50V24H17V20H16V14H20Z" fill={accent} /><path d="M20 20H50V24H20Z" fill={ink} /><path d="M30 12H36V18H30Z" fill={background} /></>}
      {angry ? <path d="M22 25H26V27H29V29H25V27H22ZM36 27H39V25H43V27H39V29H36Z" fill={hair} />
        : concerned ? <path d="M22 26H25V24H29V26H25V28H22ZM36 24H40V26H43V28H40V26H36Z" fill={hair} />
          : <path d="M22 25H29V27H22ZM36 25H43V27H36Z" fill={hair} />}
      {happy ? <path d="M23 30H28V32H26V31H25V32H23ZM37 30H42V32H40V31H39V32H37Z" fill={ink} />
        : <path d="M25 29H28V33H25ZM37 29H40V33H37Z" fill={ink} />}
      <path d="M31 31H33V35H35V37H31Z" fill={shadow} />
      {person.beard && <path d="M21 34H24V38H28V40H37V38H42V34H44V39H40V43H25V40H21Z" fill={hair} />}
      {happy ? <><path d="M27 37H38V40H35V42H30V40H27Z" fill={ink} /><path d="M29 37H36V39H29Z" fill="#f7efe3" /></>
        : angry ? <path d="M28 39H30V37H36V39H39V41H36V39H30V41H28Z" fill={ink} />
          : concerned ? <path d="M29 39H31V37H36V39H38V40H35V39H31V40H29Z" fill={ink} />
            : <path d="M29 39H37V41H29Z" fill={ink} />}
      {accessory === 'glasses' && <><path d="M20 28H30V35H20ZM35 28H45V35H35Z" fill="none" stroke={ink} strokeWidth="2" /><path d="M30 30H35V32H30Z" fill={ink} /></>}
      {accessory === 'strap' && <path d="M17 47H23V51H27V55H31V59H35V64H29V60H25V56H21V52H17Z" fill={accent} />}
      {accessory === 'apron' && <><path d="M22 48H26V54H38V48H42V64H22Z" fill={accent} /><path d="M28 58H37V64H28Z" fill={background} opacity=".55" /></>}
      {accessory === 'badge' && <><path d="M40 50H48V60H40Z" fill="#f5f1df" /><path d="M42 52H46V55H42Z" fill={accent} /><path d="M42 57H46V58H42Z" fill={shirt} /></>}
      {accessory === 'vest' && <path d="M13 55H21V59H13ZM43 55H51V59H43Z" fill="#eee0b2" />}
      {emotion === 'grateful' && <path d="M51 7H55V9H57V7H61V11H59V13H57V15H55V13H53V11H51Z" fill="#aa7f83" />}
      {angry && <path d="M53 7H55V11H59V13H55V17H53V13H49V11H53Z" fill="#b98072" />}
    </svg>
  );
}
