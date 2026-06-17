import TagChip from './TagChip'

export default function PostCard({ post, onClick }) {
  return (
    <article className="post-card" onClick={onClick}>
      <h2 className="post-card__title">{post.title}</h2>
      {post.tags?.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {post.tags.map((tag) => <TagChip key={tag}>#{tag}</TagChip>)}
        </div>
      )}
      <p className="post-card__meta">
        {post.authorNickname} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
      </p>
    </article>
  )
}
