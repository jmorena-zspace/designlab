// The shapes of the five kinds of content you can search for.
// Each kind has its own set of attributes (a resource has no keywords, a collection
// has no launch code, and so on), so each gets its own type.

export type ContentType = 'lesson' | 'collection' | 'app' | 'resource' | 'model'

// A lesson is launched inside an application (for example "Studio").
export type Lesson = {
  type: 'lesson'
  id: string
  name: string
  subject: string
  application: string // the name of the app it launches in (matches an App's name)
  keywords: string[]
  code: string // the quick launch code, like "A614"
}

// A collection is a playlist of lessons.
export type Collection = {
  type: 'collection'
  id: string
  name: string
  keywords: string[]
  lessonCodes: string[] // the quick launch codes of the lessons inside it
}

export type App = {
  type: 'app'
  id: string
  name: string
  keywords: string[]
  code: string // like "AP64"
}

// A resource is a document or video that belongs to an application.
export type Resource = {
  type: 'resource'
  id: string
  name: string
  application: string
}

// A Studio model is a single 3D model.
export type Model = {
  type: 'model'
  id: string
  name: string
  subject: string
  keywords: string[]
  code: string // like "M210"
}

// "Any one of the five." The `type` field tells them apart, so code can check
// `item.type === 'lesson'` and TypeScript then knows which attributes exist.
export type SearchItem = Lesson | Collection | App | Resource | Model
