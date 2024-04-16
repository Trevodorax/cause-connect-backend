import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PlugIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  author: string;

  @Column()
  jarFilePath: string;
}
