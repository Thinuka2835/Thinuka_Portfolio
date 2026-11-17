import { useState } from 'react'
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_KEYS } from '../../../shared/socialPlatforms.js'
import { TOOL_ICON_KEYS } from '../../../shared/toolIcons.js'
import CollectionManager from '../components/CollectionManager'
import { PageHeader } from '../ui'
import { thumb } from '../media'

export function SocialLinksPage() {
  return (
    <>
      <PageHeader
        title="Social links"
        description="Shown as icons in the footer. Only visible links with a valid https URL appear; nothing is shown for profiles you haven’t added."
      />
      <CollectionManager
        endpoint="social-links"
        singular="Social link"
        emptyText="No social links yet."
        defaults={{ platform: 'github', url: '', label: '', visible: true }}
        fields={[
          { name: 'platform', label: 'Platform', type: 'select', options: SOCIAL_PLATFORM_KEYS.map((k) => ({ value: k, label: SOCIAL_PLATFORMS[k].label })) },
          { name: 'url', label: 'Profile URL', type: 'url', required: true, placeholder: 'https://', maxLength: 500 },
          { name: 'label', label: 'Accessible label (optional)', hint: 'Defaults to the platform name, e.g. “GitHub”.', maxLength: 60 },
          { name: 'visible', label: 'Visible on the site', type: 'checkbox' },
        ]}
        columns={[
          { key: 'platform', label: 'Platform', render: (i) => SOCIAL_PLATFORMS[i.platform]?.label || i.platform },
          { key: 'url', label: 'URL', render: (i) => <a className="a-link a-truncate" href={i.url} target="_blank" rel="noopener noreferrer">{i.url}</a> },
        ]}
      />
    </>
  )
}

export function CertificationsPage() {
  return (
    <>
      <PageHeader title="Certifications & achievements" description="The gallery on the home page. Images come from the media library." />
      <CollectionManager
        endpoint="certifications"
        singular="Certification"
        emptyText="No certifications yet."
        needsMedia
        defaults={{ title: '', issuer: '', year: '', url: '', imageId: null, visible: true }}
        fields={[
          { name: 'title', label: 'Title', required: true, maxLength: 150 },
          { name: 'issuer', label: 'Issuer', maxLength: 100 },
          { name: 'year', label: 'Year', placeholder: '2024', maxLength: 4 },
          { name: 'url', label: 'Credential URL (optional)', type: 'url', placeholder: 'https://', maxLength: 500 },
          { name: 'imageId', label: 'Certificate image (optional)', type: 'image' },
          { name: 'visible', label: 'Visible on the site', type: 'checkbox' },
        ]}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'issuer', label: 'Issuer', render: (i) => [i.issuer, i.year].filter(Boolean).join(' · ') },
          {
            key: 'imageId',
            label: 'Image',
            render: (i, media) => (media[i.imageId] ? <img className="a-thumb" src={thumb(media[i.imageId].secureUrl, 96)} alt="" /> : '—'),
          },
        ]}
      />
    </>
  )
}

const TABS = {
  stats: {
    label: 'Stats',
    props: {
      endpoint: 'stats',
      singular: 'Stat',
      emptyText: 'No stats yet.',
      defaults: { value: '', suffix: '+', label: '', visible: true },
      fields: [
        { name: 'value', label: 'Number', type: 'number', required: true },
        { name: 'suffix', label: 'Suffix', hint: 'e.g. + or %', maxLength: 4 },
        { name: 'label', label: 'Label', required: true, maxLength: 60 },
        { name: 'visible', label: 'Visible on the site', type: 'checkbox' },
      ],
      columns: [
        { key: 'label', label: 'Label' },
        { key: 'value', label: 'Value', render: (i) => `${i.value}${i.suffix}` },
      ],
    },
  },
  tools: {
    label: 'Tools',
    props: {
      endpoint: 'tools',
      singular: 'Tool',
      emptyText: 'No tools yet.',
      defaults: { name: '', iconKey: TOOL_ICON_KEYS[0], visible: true },
      fields: [
        { name: 'name', label: 'Name', required: true, maxLength: 60 },
        { name: 'iconKey', label: 'Icon', type: 'select', options: TOOL_ICON_KEYS.map((k) => ({ value: k, label: k.replace(/^Si/, '') })) },
        { name: 'visible', label: 'Visible on the site', type: 'checkbox' },
      ],
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'iconKey', label: 'Icon', render: (i) => i.iconKey.replace(/^Si/, '') },
      ],
    },
  },
  ticker: {
    label: 'Skills ticker',
    props: {
      endpoint: 'ticker',
      singular: 'Ticker item',
      emptyText: 'No ticker items yet.',
      defaults: { label: '', visible: true },
      fields: [
        { name: 'label', label: 'Text', required: true, maxLength: 60 },
        { name: 'visible', label: 'Visible on the site', type: 'checkbox' },
      ],
      columns: [{ key: 'label', label: 'Text' }],
    },
  },
}

export function SectionsPage() {
  const [tab, setTab] = useState('stats')
  return (
    <>
      <PageHeader title="Home sections" description="Stats, tools and the scrolling skills ticker." />
      <div className="a-tabs" role="tablist" aria-label="Section">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            className="a-tab"
            onClick={() => setTab(key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        <CollectionManager key={tab} {...TABS[tab].props} />
      </div>
    </>
  )
}
