// Built-in, general-purpose starting templates. Selecting one creates a draft
// pre-filled with a standard skeleton the officer edits. Content field shapes
// match each type's DOCX renderer so exports come out correctly.
const T = [
  {
    id: 'memo-standard', name: 'Internal Memo', documentType: 'memo',
    description: 'Standard internal memorandum with To / From / Subject.',
    content: {
      to: '[Recipient name and title]',
      from: '[Your name and title]',
      through: '[Through — supervisor, if any]',
      subject: '[Subject of the memo]',
      paragraphs: [
        '[Opening — state the purpose of this memo.]',
        '[Body — provide the details, background and any actions required.]',
        '[Closing — summarise and state next steps or deadlines.]',
      ],
      signoff: '[Name]\n[Designation]',
    },
  },
  {
    id: 'letter-official', name: 'Official Letter', documentType: 'letter',
    description: 'Formal outgoing letter on the office letterhead.',
    content: {
      date: '[Date]',
      recipient_block: '[Recipient name]\n[Title]\n[Organisation]\n[Address]',
      salutation: 'Dear [Sir/Madam],',
      subject: '[Subject of the letter]',
      paragraphs: [
        '[Opening — reason for writing.]',
        '[Body — full details.]',
        '[Closing — requested action or courtesy close.]',
      ],
      closing: 'Yours faithfully,',
      signature: '[Name]\n[Designation]',
    },
  },
  {
    id: 'circular-general', name: 'Circular', documentType: 'circular',
    description: 'Notice circulated to many recipients.',
    content: {
      to: 'All [officers / departments]',
      from: '[Issuing office]',
      subject: '[Subject of the circular]',
      paragraphs: [
        '[State the directive or information being circulated.]',
        '[Provide details, effective dates and any required action.]',
      ],
      signoff: '[Name]\n[Designation]',
    },
  },
  {
    id: 'report-standard', name: 'Report', documentType: 'report',
    description: 'General report with summary, sections and recommendations.',
    content: {
      title: '[Report title]',
      executive_summary: '[One-paragraph summary of the report.]',
      sections: [
        { title: 'Background', body: '[Context and purpose.]' },
        { title: 'Findings', body: '[Key findings.]' },
        { title: 'Discussion', body: '[Analysis of the findings.]' },
      ],
      recommendations: ['[Recommendation 1]', '[Recommendation 2]'],
    },
  },
  {
    id: 'policy-brief', name: 'Policy Brief', documentType: 'policy_brief',
    description: 'Concise brief for decision-makers.',
    content: {
      title: '[Policy brief title]',
      executive_summary: '[Summary of the issue and recommended action.]',
      sections: [
        { title: 'Issue', body: '[Define the policy issue.]' },
        { title: 'Options', body: '[Set out the options considered.]' },
        { title: 'Analysis', body: '[Weigh the options.]' },
      ],
      recommendations: ['[Preferred option and rationale.]'],
    },
  },
  {
    id: 'briefing-note', name: 'Briefing Note', documentType: 'briefing_note',
    description: 'Short note to brief a principal ahead of an engagement.',
    content: {
      title: '[Briefing note title]',
      executive_summary: '[Purpose of the briefing.]',
      sections: [
        { title: 'Background', body: '[What the principal needs to know.]' },
        { title: 'Key Points', body: '[Bullet the essential points.]' },
        { title: 'Suggested Talking Points', body: '[What to say.]' },
      ],
      recommendations: ['[Recommended position or action.]'],
    },
  },
  {
    id: 'concept-note', name: 'Concept Note', documentType: 'concept_note',
    description: 'Outline of a proposed programme or activity.',
    content: {
      title: '[Concept note title]',
      executive_summary: '[Summary of the proposed initiative.]',
      sections: [
        { title: 'Rationale', body: '[Why this is needed.]' },
        { title: 'Objectives', body: '[What it will achieve.]' },
        { title: 'Implementation', body: '[How it will be done, by whom, when.]' },
        { title: 'Budget', body: '[Indicative budget, if any.]' },
      ],
      recommendations: ['[Approval or next step sought.]'],
    },
  },
  {
    id: 'minutes-blank', name: 'Meeting Minutes (blank)', documentType: 'minutes',
    description: 'Blank minutes structure to fill by hand.',
    content: {
      heading: 'MINUTES OF THE [MEETING NAME] HELD ON [DATE] AT [VENUE]',
      preamble: 'Present: [names]\nApologies: [names]',
      sections: [
        { title: 'Min 1/[YYYY]: Preliminaries', content: '[Opening remarks and confirmation of quorum.]' },
        { title: 'Min 2/[YYYY]: Confirmation of Previous Minutes', content: '[Confirmed / amended.]' },
        { title: 'Min 3/[YYYY]: [Agenda item]', content: '[Discussion and decisions.]' },
      ],
      action_matrix: [{ action: '[Action]', responsible: '[Who]', timeline: '[When]' }],
      closing: 'There being no other business, the meeting ended at [time].',
    },
  },
  {
    id: 'speech-remarks', name: 'Speech / Remarks', documentType: 'speech',
    description: 'Formal remarks for an event.',
    content: {
      heading: 'REMARKS BY [NAME/TITLE] AT [EVENT] ON [DATE]',
      body: '[Salutations — recognise dignitaries present.]\n\n[Opening — thank the hosts and state why you are here.]\n\n[Main message — the substance of your remarks.]\n\n[Call to action or closing thoughts.]',
      closing: 'Thank you. God bless you, and God bless our nation.',
    },
  },
];

export default T;
