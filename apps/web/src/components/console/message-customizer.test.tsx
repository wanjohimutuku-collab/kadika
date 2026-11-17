import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MessageCustomizer, SWAHILI_TAGS, ENGLISH_TAGS } from './message-customizer';

describe('MessageCustomizer', () => {
  it('renders Swahili tags and custom message in HTML', () => {
    const html = renderToString(
      <MessageCustomizer
        channelName="WhatsApp"
        value="Habari {mgeni}! Karibu kwenye sherehe ya {wenyeji}."
        defaultValue="Habari {mgeni}!"
        onChange={() => {}}
        locale="sw"
      />,
    );

    expect(html).toContain('Hariri Ujumbe wa WhatsApp');
    expect(html).toContain('{mgeni}');
    expect(html).toContain('{wenyeji}');
    expect(html).toContain('{kiungo}');
    expect(html).toContain('Habari {mgeni}! Karibu kwenye sherehe ya {wenyeji}.');
  });

  it('renders English tags when locale is en', () => {
    const html = renderToString(
      <MessageCustomizer
        channelName="WhatsApp"
        value="Hello {guest}! Welcome to {hosts} wedding."
        defaultValue="Hello {guest}!"
        onChange={() => {}}
        locale="en"
      />,
    );

    expect(html).toContain('Edit WhatsApp Message');
    expect(html).toContain('{guest}');
    expect(html).toContain('{hosts}');
    expect(html).toContain('{link}');
  });

  it('provides all required Swahili tags', () => {
    const tags = SWAHILI_TAGS.map((t) => t.tag);
    expect(tags).toContain('{mgeni}');
    expect(tags).toContain('{wenyeji}');
    expect(tags).toContain('{tarehe}');
    expect(tags).toContain('{muda}');
    expect(tags).toContain('{ukumbi}');
    expect(tags).toContain('{kiungo}');
    expect(tags).toContain('{kadi}');
  });

  it('provides canonical English tags', () => {
    const tags = ENGLISH_TAGS.map((t) => t.tag);
    expect(tags).toContain('{guest}');
    expect(tags).toContain('{hosts}');
    expect(tags).toContain('{date}');
    expect(tags).toContain('{time}');
    expect(tags).toContain('{venue}');
    expect(tags).toContain('{link}');
    expect(tags).toContain('{code}');
  });
});
