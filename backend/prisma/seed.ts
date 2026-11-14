import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashFlag } from '../src/challenges/flag';

const url = new URL(process.env.DATABASE_URL ?? '');
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 2,
  }),
});

interface SeedCourse {
  title: string;
  slug: string;
  summary: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  lessons: { title: string; content: string }[];
}

const courses: SeedCourse[] = [
  {
    title: 'Web Security Basics',
    slug: 'web-security-basics',
    summary: 'How websites work, where they break, and how to build them safely.',
    level: 'BEGINNER',
    lessons: [
      {
        title: 'How the web works',
        content:
          'Every page you visit starts with a request from your browser (the client) to a server. The server answers with a response: a status code such as 200 (OK) or 404 (not found), plus the page itself.\n\nSecurity matters because everything a browser sends is controlled by the person using it. Anything that crosses from the client to the server is a trust boundary, and the server must never assume it is safe.',
      },
      {
        title: 'Never trust user input',
        content:
          'Form fields, URLs, cookies and headers are all input, and all of them can be changed by an attacker. Checking input in the browser only helps honest users; the server has to check it again.\n\nPrefer allow-lists: define exactly what is valid (for example, an age is a whole number from 0 to 120) and reject everything else, instead of trying to list every bad value.',
      },
      {
        title: 'SQL injection',
        content:
          'SQL injection happens when an application builds a database query by joining text together with user input. The input can then change the meaning of the query itself, letting an attacker read or alter data they should not reach.\n\nThe fix is parameterized queries (also called prepared statements). The query and the data travel separately, so input is only ever treated as data. Tools such as Prisma do this for you, but raw queries built from strings bring the risk back.',
      },
    ],
  },
  {
    title: 'Network Fundamentals',
    slug: 'network-fundamentals',
    summary: 'The building blocks of networks: addresses, names and connections.',
    level: 'BEGINNER',
    lessons: [
      {
        title: 'IP addresses and ports',
        content:
          'An IP address identifies a device on a network, like a street address for a building. A port number identifies a specific service on that device, like a door number.\n\nSome ports are well known: 22 for SSH, 80 for HTTP and 443 for HTTPS. Each open port is a way in, so security teams try to keep the list of open ports as short as possible.',
      },
      {
        title: 'DNS: names to addresses',
        content:
          'People remember names; computers need IP addresses. The Domain Name System (DNS) translates one into the other. When you type a site name, your device asks a resolver, which looks up the answer and returns it.\n\nCommon record types are A (name to IPv4 address), AAAA (name to IPv6 address), CNAME (an alias to another name) and MX (where to deliver email).',
      },
      {
        title: 'TCP and UDP',
        content:
          'TCP sets up a connection first (the three-way handshake) and makes sure data arrives complete and in order. It is used for web pages, email and file transfers.\n\nUDP skips the setup and just sends packets, which is faster but gives no delivery guarantee. It suits video calls, games and DNS lookups, where speed matters more than perfect delivery.',
      },
    ],
  },
  {
    title: 'Intro to Linux',
    slug: 'intro-to-linux',
    summary: 'Get comfortable with the command line, files and permissions.',
    level: 'BEGINNER',
    lessons: [
      {
        title: 'The command line',
        content:
          'The shell lets you control a computer by typing commands. Start with three: `pwd` shows where you are, `ls` lists the files there, and `cd` moves into another folder.\n\nWhen you are unsure about a command, `man` followed by its name opens the manual page. Reading the manual is a core skill for anyone working in security.',
      },
      {
        title: 'Files and permissions',
        content:
          'Every file has an owner, a group, and three sets of permissions: for the owner, for the group and for everyone else. Each set can allow read (r), write (w) and execute (x). Run `ls -l` to see them.\n\nThe `chmod` command changes permissions and `chown` changes the owner. The rule to remember is least privilege: give a file only the access it needs, and no more.',
      },
      {
        title: 'Processes and services',
        content:
          'A process is a running program. `ps` lists processes, `top` shows what is using the most resources, and `kill` stops one by its ID.\n\nServices are programs that run in the background, such as a web server. On most modern systems you manage them with `systemctl`, for example `systemctl status ssh`.',
      },
    ],
  },
];

interface SeedQuestion {
  prompt: string;
  explanation: string;
  /** The options in display order. */
  options: string[];
  /** Index of the correct option. */
  answer: number;
}

interface SeedAssessment {
  title: string;
  description: string;
  passPercent: number;
  questions: SeedQuestion[];
}

/** One quiz per course, keyed by the course slug. */
const assessments: Record<string, SeedAssessment> = {
  'web-security-basics': {
    title: 'Web security check',
    description: 'Trust boundaries, input checks and SQL injection.',
    passPercent: 70,
    questions: [
      {
        prompt: 'Which of these is a trust boundary?',
        explanation: 'Anything that crosses from the client to the server is controlled by the user, so the server must not assume it is safe.',
        options: [
          'Data sent from the browser to the server',
          'Two variables inside the same function',
          'A constant defined in your own code',
          'A comment in your source code',
        ],
        answer: 0,
      },
      {
        prompt: 'The browser already checks a form. Why must the server check the input again?',
        explanation: 'Browser checks only help honest users. An attacker can skip the page and send requests straight to the server.',
        options: [
          'Servers are faster at checking than browsers',
          'An attacker can skip the browser and send requests directly',
          'Browsers cannot check text fields',
          'It makes the page load more quickly',
        ],
        answer: 1,
      },
      {
        prompt: 'What does an allow-list approach to input checking do?',
        explanation: 'You define exactly what is valid and reject everything else, instead of trying to list every bad value.',
        options: [
          'Lists every known bad value and blocks only those',
          'Accepts anything shorter than a set length',
          'Defines exactly what is valid and rejects everything else',
          'Trusts input from signed-in users',
        ],
        answer: 2,
      },
      {
        prompt: 'What is the main defence against SQL injection?',
        explanation: 'With parameterized queries the query and the data travel separately, so input is only ever treated as data.',
        options: [
          'Hiding the database name',
          'Removing the word SELECT from input',
          'Using longer passwords',
          'Parameterized queries',
        ],
        answer: 3,
      },
    ],
  },
  'network-fundamentals': {
    title: 'Network basics check',
    description: 'Ports, DNS records and the two transport protocols.',
    passPercent: 70,
    questions: [
      {
        prompt: 'Which port does HTTPS use by default?',
        explanation: 'HTTPS uses 443. Port 80 is HTTP and port 22 is SSH.',
        options: ['22', '80', '443', '53'],
        answer: 2,
      },
      {
        prompt: 'Which DNS record type maps a name to an IPv4 address?',
        explanation: 'An A record maps a name to an IPv4 address. AAAA is for IPv6, CNAME is an alias and MX is for email.',
        options: ['A', 'AAAA', 'CNAME', 'MX'],
        answer: 0,
      },
      {
        prompt: 'Which protocol sets up a connection with a three-way handshake?',
        explanation: 'TCP connects first and guarantees complete, ordered delivery. UDP skips the setup.',
        options: ['UDP', 'TCP', 'DNS', 'ICMP'],
        answer: 1,
      },
    ],
  },
  'intro-to-linux': {
    title: 'Linux basics check',
    description: 'Navigation, permissions and the least privilege rule.',
    passPercent: 70,
    questions: [
      {
        prompt: 'Which command shows the folder you are currently in?',
        explanation: '`pwd` prints the working directory. `ls` lists files and `cd` changes folder.',
        options: ['ls', 'cd', 'man', 'pwd'],
        answer: 3,
      },
      {
        prompt: 'Which command changes the permissions of a file?',
        explanation: '`chmod` changes permissions. `chown` changes the owner.',
        options: ['chmod', 'chown', 'ls -l', 'ps'],
        answer: 0,
      },
      {
        prompt: 'What does the principle of least privilege mean?',
        explanation: 'Give a user or file only the access it needs, and no more.',
        options: [
          'Give everyone full access to keep things simple',
          'Give only the access that is needed, and no more',
          'Only the oldest users get access',
          'Remove all permissions from every file',
        ],
        answer: 1,
      },
    ],
  },
};


interface SeedChallenge {
  title: string;
  category: 'NETWORK_ANALYSIS' | 'FORENSICS' | 'WEB' | 'REVERSE_ENGINEERING' | 'CRYPTOGRAPHY';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  description: string;
  hint: string;
  flag: string;
}

const b64 = (text: string) => Buffer.from(text).toString('base64');
const caesar = (text: string, shift: number) =>
  text.replace(/[a-z]/gi, (letter) => {
    const base = letter <= 'Z' ? 65 : 97;
    return String.fromCharCode(((letter.charCodeAt(0) - base + shift) % 26) + base);
  });

// Sample challenges so the page is not empty. Their flags are visible in this file,
// so unpublish or delete them before using the platform for real.
const sampleChallenges: SeedChallenge[] = [
  {
    title: 'Cookie monster',
    category: 'WEB',
    difficulty: 'EASY',
    points: 50,
    description: `A web app stores your login state in a cookie instead of on the server. You copied this cookie from your browser's developer tools:\n\n\`session=${b64(JSON.stringify({ role: 'user', note: 'flag{cookies_are_just_base64}' }))}\`\n\nCookies are controlled by the user, so anything inside one can be read and changed. Decode the value and find the flag.`,
    hint: 'The value looks like Base64. Decode it, then read the JSON inside.',
    flag: 'flag{cookies_are_just_base64}',
  },
  {
    title: "Caesar's secret",
    category: 'CRYPTOGRAPHY',
    difficulty: 'EASY',
    points: 50,
    description: `A message was encrypted with a very old cipher. Only letters were changed; braces, digits and underscores stayed the same.\n\n\`${caesar('flag{veni_vidi_vici}', 3)}\`\n\nDecrypt it to get the flag.`,
    hint: 'Julius Caesar shifted every letter by 3 places.',
    flag: 'flag{veni_vidi_vici}',
  },
  {
    title: 'Hidden in the metadata',
    category: 'FORENSICS',
    difficulty: 'EASY',
    points: 50,
    description: `You are investigating a photo from a suspect's phone. Its metadata looks ordinary, except for one field:\n\n\`File Name : holiday.jpg\`\n\n\`Camera Model : PhoneCam X\`\n\n\`Comment : ${b64('flag{metadata_never_forgets}')}\`\n\nFiles often carry data their owners do not know about. Recover the flag.`,
    hint: 'Look closely at the Comment field and how its value is encoded.',
    flag: 'flag{metadata_never_forgets}',
  },
  {
    title: 'Plain text passwords',
    category: 'NETWORK_ANALYSIS',
    difficulty: 'EASY',
    points: 50,
    description: `In a packet capture of unencrypted web traffic you find this request:\n\n\`GET /admin HTTP/1.1\`\n\n\`Host: intranet.local\`\n\n\`Authorization: Basic ${b64('admin:flag{basic_auth_is_not_encryption}')}\`\n\nThe value after Basic is not encrypted. What is the admin's password? Submit it as the flag.`,
    hint: 'HTTP Basic authentication sends username:password, only Base64 encoded.',
    flag: 'flag{basic_auth_is_not_encryption}',
  },
  {
    title: 'XOR check',
    category: 'REVERSE_ENGINEERING',
    difficulty: 'MEDIUM',
    points: 100,
    description: `A program checks a password with this logic:\n\n\`for each byte b of the input: output b XOR 42\`\n\nThe program accepts the password only when the output equals these decimal bytes:\n\n\`${[...Buffer.from('flag{xor_is_reversible}')].map((byte) => byte ^ 42).join(', ')}\`\n\nWork out the password the program expects. That password is the flag.`,
    hint: 'XOR is its own inverse: applying the same key again gives back the input.',
    flag: 'flag{xor_is_reversible}',
  },
];

async function main() {
  const author = await prisma.user.findFirst({ where: { role: 'INSTRUCTOR' } });
  if (!author) {
    console.error(
      'No instructor found. Set your account role to INSTRUCTOR in phpMyAdmin, then run the seed again.',
    );
    process.exitCode = 1;
    return;
  }

  for (const course of courses) {
    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        summary: course.summary,
        level: course.level,
        published: true,
      },
      create: {
        title: course.title,
        slug: course.slug,
        summary: course.summary,
        level: course.level,
        published: true,
        authorId: author.id,
      },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      const position = index + 1;
      await prisma.lesson.upsert({
        where: { courseId_position: { courseId: saved.id, position } },
        update: { title: lesson.title, content: lesson.content },
        create: {
          courseId: saved.id,
          position,
          title: lesson.title,
          content: lesson.content,
        },
      });
    }
    console.log(`Seeded "${course.title}" (${course.lessons.length} lessons)`);

    const quiz = assessments[course.slug];
    if (!quiz) continue;

    // Created once and then left alone, so an instructor's edits are not overwritten.
    const existing = await prisma.assessment.findFirst({
      where: { courseId: saved.id, title: quiz.title },
      select: { id: true },
    });
    if (existing) {
      console.log(`  Assessment "${quiz.title}" already exists, left as it is`);
      continue;
    }

    await prisma.assessment.create({
      data: {
        courseId: saved.id,
        title: quiz.title,
        description: quiz.description,
        passPercent: quiz.passPercent,
        published: true,
        questions: {
          create: quiz.questions.map((question, index) => ({
            position: index + 1,
            prompt: question.prompt,
            explanation: question.explanation,
            options: {
              create: question.options.map((text, optionIndex) => ({
                position: optionIndex + 1,
                text,
                isCorrect: optionIndex === question.answer,
              })),
            },
          })),
        },
      },
    });
    console.log(`  Seeded assessment "${quiz.title}" (${quiz.questions.length} questions)`);
  }

  // Created once and then left alone, so an instructor's edits and flags are not overwritten.
  for (const challenge of sampleChallenges) {
    const existing = await prisma.challenge.findFirst({
      where: { authorId: author.id, title: challenge.title },
      select: { id: true },
    });
    if (existing) {
      console.log(`Challenge "${challenge.title}" already exists, left as it is`);
      continue;
    }
    const { flag, ...rest } = challenge;
    await prisma.challenge.create({
      data: { ...rest, ...hashFlag(flag), authorId: author.id, published: true },
    });
    console.log(`Seeded challenge "${challenge.title}"`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());