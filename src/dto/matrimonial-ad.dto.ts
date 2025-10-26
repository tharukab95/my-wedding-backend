import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class InitializeMatrimonialAdDto {
  @IsString()
  firebaseUserId: string;
}

export class SavePhaseDataDto {
  @IsInt()
  @Min(1)
  @Max(7)
  phase: number;

  @IsOptional()
  data?: any;
}

export class Phase1DataDto {
  @IsEnum(['self', 'parent', 'guardian'])
  advertiserType: 'self' | 'parent' | 'guardian';
}

export class Phase2DataDto {
  @IsEnum(['bride', 'groom'])
  type: 'bride' | 'groom';

  @IsString()
  name: string;

  @IsDateString()
  birthday: string;

  @IsString()
  birthTime: string;

  @IsInt()
  @Min(18)
  @Max(100)
  age: number;

  @IsString()
  profession: string;

  @IsString()
  height: string;

  @IsString()
  caste: string;

  @IsString()
  religion: string;

  @IsString()
  ethnicity: string;

  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  hasChildren?: string;

  @IsString()
  location: string;

  @IsString()
  education: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];
}

export class Phase3DataDto {
  @IsString()
  fatherProfession: string;

  @IsString()
  motherProfession: string;

  @IsString()
  familyStatus: string;

  @IsInt()
  @Min(0)
  brothersCount: number;

  @IsInt()
  @Min(0)
  sistersCount: number;
}

export class Phase6DataDto {
  @IsOptional()
  @IsString()
  migrationPlans?: string;

  @IsOptional()
  @IsString()
  skinTone?: string;

  @IsOptional()
  @IsString()
  minAge?: string;

  @IsOptional()
  @IsString()
  maxAge?: string;

  @IsOptional()
  @IsString()
  preferredEducation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProfessions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredHabits?: string[];
}

export class Phase7DataDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assets?: string[];
}

export class SubmitAdDto {
  // No body needed for submission
}
